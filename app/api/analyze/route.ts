import "server-only";
import "pdf-parse/worker";

import { GoogleGenAI } from "@google/genai";
import { PDFParse } from "pdf-parse";
import { z } from "zod";

import {
  createAnalysisPreview,
  getAnalysisConfig,
  type AnalysisResult,
  validateAnalysisResult,
} from "@/lib/analysis-config";
import { hasAcknowledgedAnalysisDisclaimer } from "@/lib/analysis-disclaimer";
import { analysisIntentSchema } from "@/lib/analysis-intent";
import { contractTypeSchema } from "@/lib/contract-type";
import { reviewPerspectiveSchema } from "@/lib/review-perspective";
import {
  AnalysisRateLimitUnavailableError,
  consumeAnalysisRateLimit,
  getClientIp,
  hashRateLimitIdentifier,
} from "@/lib/analysis-rate-limit";
import { createContractAccessToken } from "@/lib/contract-access-token";
import {
  GeminiOutputError,
  parseAndValidateGeminiOutput,
} from "@/lib/gemini-output";
import {
  getGeminiModelCandidates,
  isGeminiAbortError,
  isGeminiNetworkError,
  isGeminiRequestRejected,
  isRetryableGeminiError,
  withGeminiRetry,
} from "@/lib/gemini-retry";
import {
  generateAndValidateOpenAIAnalysis,
  generateOpenAIAnalysis,
  OpenAIAnalysisError,
} from "@/lib/openai-analysis";
import {
  errorResponse,
  getRequestId,
  jsonResponse,
  logServerFailure,
} from "@/lib/request-observability";
import { getAnalysisEnvironment } from "@/lib/server-env";
import {
  createReportRecoveryToken,
  hashReportRecoveryToken,
} from "@/lib/report-access";
import { createSupabaseAdmin } from "@/lib/supabase-admin";
import {
  parseTurnstileHostnames,
  verifyTurnstileToken,
} from "@/lib/turnstile";

export const runtime = "nodejs";

const LOCAL_TURNSTILE_TEST_TOKEN = "local-development-turnstile-bypass";

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;
const MAX_EXTRACTED_CHARACTERS = 750_000;
// Netlify allows 60 seconds for a synchronous function. Keep both providers
// inside that shared window, with enough time left to persist the report.
const GEMINI_FALLBACK_TIMEOUT_MS = 15_000;
const OPENAI_FALLBACK_TIMEOUT_MS = 35_000;

function sanitizeFileName(name: string): string {
  const baseName = name.split(/[\\/]/).pop() ?? "contract.pdf";
  const sanitized = baseName
    .replace(/[\u0000-\u001f\u007f]/g, "")
    .trim()
    .slice(0, 255);

  return sanitized || "contract.pdf";
}

function hasPdfSignature(bytes: Uint8Array): boolean {
  return (
    bytes.length >= 5 &&
    bytes[0] === 0x25 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x44 &&
    bytes[3] === 0x46 &&
    bytes[4] === 0x2d
  );
}

function rateLimitResponse(
  requestId: string,
  retryAfterSeconds: number,
): Response {
  return errorResponse(
    requestId,
    "Too many analyses were requested. Please try again later.",
    429,
    { "Retry-After": String(Math.max(1, retryAfterSeconds)) },
  );
}

export async function POST(request: Request): Promise<Response> {
  const requestId = getRequestId(request.headers);
  const contentType = request.headers.get("content-type") ?? "";

  if (!contentType.toLowerCase().startsWith("multipart/form-data")) {
    return errorResponse(
      requestId,
      "Expected a multipart/form-data request containing a PDF file.",
      415,
    );
  }

  const contentLength = Number(request.headers.get("content-length"));

  if (
    Number.isFinite(contentLength) &&
    contentLength > MAX_FILE_SIZE_BYTES + 1_000_000
  ) {
    return errorResponse(requestId, "The PDF must be 10 MB or smaller.", 413);
  }

  try {
    const environment = getAnalysisEnvironment();
    const formData = await request.formData();
    const intentResult = analysisIntentSchema.safeParse(formData.get("intent"));

    if (!intentResult.success) {
      return errorResponse(
        requestId,
        'Choose either "What the heck am I signing?" or "What the heck did I just sign?".',
        400,
      );
    }

    const intent = intentResult.data;
    const contractTypeResult = contractTypeSchema.safeParse(
      formData.get("contract_type"),
    );
    if (!contractTypeResult.success) {
      return errorResponse(
        requestId,
        "Choose the kind of contract you want reviewed.",
        400,
      );
    }
    const contractType = contractTypeResult.data;
    const perspectiveResult = reviewPerspectiveSchema.safeParse(
      formData.get("review_perspective"),
    );
    if (!perspectiveResult.success) {
      return errorResponse(
        requestId,
        "Tell us which person, business, or prospective contract role you are reviewing this for.",
        400,
      );
    }
    const reviewPerspective = perspectiveResult.data;
    if (
      !hasAcknowledgedAnalysisDisclaimer(
        formData.get("disclaimer_acknowledged"),
      )
    ) {
      return errorResponse(
        requestId,
        "Confirm that you understand this is educational analysis, not legal advice.",
        400,
      );
    }

    const turnstileToken = formData.get("turnstile_token");
    const remoteIp = getClientIp(request.headers, process.env.NODE_ENV);
    if (!remoteIp) {
      return errorResponse(
        requestId,
        "Client verification is unavailable.",
        503,
      );
    }
    const localTurnstileTestBypass =
      process.env.NODE_ENV === "development" &&
      environment.TURNSTILE_TEST_MODE === "true" &&
      turnstileToken === LOCAL_TURNSTILE_TEST_TOKEN;
    if (
      typeof turnstileToken !== "string" ||
      (!localTurnstileTestBypass && !(await verifyTurnstileToken({
        token: turnstileToken,
        secret: environment.TURNSTILE_SECRET,
        expectedAction: "analyze_contract",
        expectedHostnames: parseTurnstileHostnames(
          environment.TURNSTILE_HOSTNAMES,
        ),
        remoteIp,
        testMode: environment.TURNSTILE_TEST_MODE === "true",
      })))
    ) {
      return errorResponse(
        requestId,
        "Browser verification failed. Refresh the check and try again.",
        403,
      );
    }

    const uploadedValue = formData.get("file");

    if (!(uploadedValue instanceof File)) {
      return errorResponse(
        requestId,
        'The multipart field named "file" must contain a PDF.',
        400,
      );
    }

    if (uploadedValue.size === 0) {
      return errorResponse(requestId, "The uploaded PDF is empty.", 400);
    }

    if (uploadedValue.size > MAX_FILE_SIZE_BYTES) {
      return errorResponse(requestId, "The PDF must be 10 MB or smaller.", 413);
    }

    if (uploadedValue.type && uploadedValue.type !== "application/pdf") {
      return errorResponse(requestId, "Only PDF files are supported.", 415);
    }

    const pdfBytes = new Uint8Array(await uploadedValue.arrayBuffer());

    if (!hasPdfSignature(pdfBytes)) {
      return errorResponse(
        requestId,
        "The uploaded file is not a valid PDF.",
        415,
      );
    }

    const supabaseAdmin = createSupabaseAdmin(
      environment.NEXT_PUBLIC_SUPABASE_URL,
      environment.SUPABASE_SECRET_KEY,
    );
    const rateLimit = await consumeAnalysisRateLimit(supabaseAdmin, {
      identifierHash: hashRateLimitIdentifier(
        remoteIp,
        environment.RATE_LIMIT_HMAC_SECRET,
      ),
      maxRequests: environment.ANALYSIS_RATE_LIMIT_MAX,
      windowSeconds: environment.ANALYSIS_RATE_LIMIT_WINDOW_SECONDS,
    });
    if (!rateLimit.allowed) {
      return rateLimitResponse(requestId, rateLimit.retryAfterSeconds);
    }

    const parser = new PDFParse({ data: pdfBytes });
    let extractedText: string;
    let pageCount: number;

    try {
      const parsedPdf = await parser.getText();
      extractedText = parsedPdf.text.trim();
      pageCount = parsedPdf.total;
    } finally {
      await parser.destroy();
    }

    if (!Number.isInteger(pageCount) || pageCount < 1) {
      return errorResponse(
        requestId,
        "The PDF page count could not be determined.",
        422,
      );
    }

    if (!extractedText) {
      return errorResponse(
        requestId,
        "No readable text was found. This PDF may be scanned or image-only.",
        422,
      );
    }

    if (extractedText.length > MAX_EXTRACTED_CHARACTERS) {
      return errorResponse(
        requestId,
        "This contract contains too much text for the initial scanner.",
        413,
      );
    }

    const analysisConfig = getAnalysisConfig(
      intent,
      reviewPerspective,
      contractType,
    );

    const gemini = new GoogleGenAI({
      apiKey: environment.GEMINI_API_KEY,
    });
    const geminiModels = getGeminiModelCandidates(environment.GEMINI_MODEL);

    let validatedResult: AnalysisResult;

    try {
      validatedResult = await withGeminiRetry(
        async ({ attempt }) => {
          const geminiResponse = await gemini.models.generateContent({
            model: geminiModels[attempt - 1],
            contents: [
              {
                role: "user",
                parts: [
                  {
                    text: [
                      analysisConfig.userInstruction,
                      "",
                      "<contract_text>",
                      extractedText,
                      "</contract_text>",
                    ].join("\n"),
                  },
                ],
              },
            ],
            config: {
              abortSignal: request.signal,
              httpOptions: {
                // The SDK otherwise retries up to five times internally,
                // consuming the time reserved for the independent fallback.
                retryOptions: { attempts: 1 },
                timeout: environment.OPENAI_API_KEY
                  ? Math.min(
                      environment.GEMINI_REQUEST_TIMEOUT_MS,
                      GEMINI_FALLBACK_TIMEOUT_MS,
                    )
                  : environment.GEMINI_REQUEST_TIMEOUT_MS,
              },
              systemInstruction: analysisConfig.systemPrompt,
              temperature: 0,
              maxOutputTokens: 8_000,
              responseMimeType: "application/json",
              responseJsonSchema: analysisConfig.jsonSchema,
            },
          });

          return parseAndValidateGeminiOutput(
            geminiResponse.text,
            (value) =>
              validateAnalysisResult(intent, value, {
                contractText: extractedText,
              }),
          );
        },
        {
          // Preserve the serverless execution window for the independent
          // provider fallback instead of exhausting it on same-provider
          // retries. Deployments without OpenAI configured still try each
          // Gemini candidate before returning an availability error.
          maxAttempts: environment.OPENAI_API_KEY ? 1 : geminiModels.length,
          onRetry: ({ attempt, delayMs, status }) => {
            logServerFailure({
              level: "warn",
              event: "gemini_retry",
              requestId,
              route: "/api/analyze",
              error: null,
              metadata: {
                attempt,
                delay_ms: delayMs,
                failed_model: geminiModels[attempt - 1],
                next_model: geminiModels[attempt],
                status: status ?? null,
              },
            });
          },
        },
      );
    } catch (geminiError) {
      const providerTimedOut =
        isGeminiAbortError(geminiError) && !request.signal.aborted;
      const providerNetworkFailed = isGeminiNetworkError(geminiError);
      const providerRejectedRequest = isGeminiRequestRejected(geminiError);
      if (
        !environment.OPENAI_API_KEY ||
        (!isRetryableGeminiError(geminiError) &&
          !providerTimedOut &&
          !providerNetworkFailed &&
          !providerRejectedRequest)
      ) {
        throw geminiError;
      }

      logServerFailure({
        level: "warn",
        event: "analysis_provider_fallback",
        requestId,
        route: "/api/analyze",
        error: geminiError,
        metadata: {
          from_provider: "google_gemini",
          to_provider: "openai",
          model: environment.OPENAI_MODEL,
        },
      });

      const openAIApiKey = environment.OPENAI_API_KEY;
      // Schema retries share one fallback budget rather than restarting it.
      const fallbackSignal = AbortSignal.any([
        request.signal,
        AbortSignal.timeout(OPENAI_FALLBACK_TIMEOUT_MS),
      ]);
      validatedResult = await generateAndValidateOpenAIAnalysis({
        generate: () =>
          generateOpenAIAnalysis({
            apiKey: openAIApiKey,
            model: environment.OPENAI_MODEL,
            systemPrompt: analysisConfig.systemPrompt,
            userInstruction: analysisConfig.userInstruction,
            contractText: extractedText,
            jsonSchema: analysisConfig.jsonSchema,
            requestId,
            requestSignal: fallbackSignal,
            timeoutMs: Math.min(
              environment.OPENAI_REQUEST_TIMEOUT_MS,
              OPENAI_FALLBACK_TIMEOUT_MS,
            ),
          }),
        validate: (openAIOutput) =>
          parseAndValidateGeminiOutput(
            openAIOutput,
            (value) =>
              validateAnalysisResult(intent, value, {
                contractText: extractedText,
              }),
          ),
        onInvalidOutput: ({ attempt, error, willRetry }) => {
          const validationCause = error.cause;
          logServerFailure({
            level: "warn",
            event: willRetry
              ? "openai_output_retry"
              : "openai_output_rejected",
            requestId,
            route: "/api/analyze",
            error: null,
            metadata: {
              model: environment.OPENAI_MODEL,
              reason: "schema_invalid_output",
              attempt,
              validation_error:
                validationCause instanceof Error
                  ? validationCause.message.slice(0, 1_000)
                  : null,
            },
          });
        },
      });
    }

    const preview = createAnalysisPreview(validatedResult);
    const recoveryToken = createReportRecoveryToken();

    const { data: createdContracts, error: contractError } = await supabaseAdmin.rpc(
      "create_contract_analysis",
      {
        p_file_name: sanitizeFileName(uploadedValue.name),
        p_full_report: validatedResult,
        p_page_count: pageCount,
        p_recovery_token_hash: hashReportRecoveryToken(recoveryToken),
        p_contract_type: contractType,
        p_intent: intent,
        p_review_perspective: reviewPerspective,
        p_tease_summary: preview,
      },
    );

    const createdContract = Array.isArray(createdContracts)
      ? createdContracts[0]
      : undefined;
    if (
      contractError ||
      !createdContract ||
      typeof createdContract.contract_id !== "string" ||
      typeof createdContract.report_expires_at !== "string"
    ) {
      throw new Error(
        `Could not create contract and analysis records: ${
          contractError?.message ?? "unknown database error"
        }`,
      );
    }
    const contractId = createdContract.contract_id;

    const checkoutTokenSecret = process.env.CHECKOUT_TOKEN_SECRET?.trim();

    return jsonResponse(
      requestId,
      {
        contract_id: contractId,
        report_expires_at: createdContract.report_expires_at,
        recovery_token: recoveryToken,
        checkout_token:
          checkoutTokenSecret && checkoutTokenSecret.length >= 32
            ? createContractAccessToken(contractId, checkoutTokenSecret)
            : undefined,
        intent,
        tease: preview,
      },
      {
        status: 201,
        headers: { "Cache-Control": "no-store" },
      },
    );
  } catch (error) {
    const validationMetadata =
      error instanceof z.ZodError
        ? {
            validation_issue_count: error.issues.length,
            validation_issue_paths: error.issues
              .map((issue) => issue.path.join(".") || "root")
              .slice(0, 10)
              .join(","),
          }
        : undefined;
    logServerFailure({
      event: "analysis_failed",
      requestId,
      route: "/api/analyze",
      error,
      metadata: validationMetadata,
    });

    if (error instanceof z.ZodError) {
      const invalidFields = error.issues
        .map((issue) => issue.path.join(".") || "unknown")
        .slice(0, 10)
        .join(", ");
      return errorResponse(
        requestId,
        `The analysis service is missing or has invalid server configuration: ${invalidFields}.`,
        503,
      );
    }

    if (error instanceof GeminiOutputError) {
      return errorResponse(
        requestId,
        "The analysis service returned an incomplete result. Please try again.",
        502,
      );
    }

    if (error instanceof AnalysisRateLimitUnavailableError) {
      return errorResponse(
        requestId,
        "Analysis is temporarily unavailable. Please try again shortly.",
        503,
      );
    }

    if (error instanceof OpenAIAnalysisError) {
      return jsonResponse(
        requestId,
        {
          error: "The backup analysis service could not complete this report. Please try again.",
          request_id: requestId,
          ...(process.env.DEPLOY_CONTEXT === "deploy-preview"
            ? {
                diagnostic: {
                  provider: "openai",
                  status: error.status ?? null,
                },
              }
            : {}),
        },
        { status: 502, headers: { "Cache-Control": "no-store" } },
      );
    }

    if (isRetryableGeminiError(error)) {
      return errorResponse(
        requestId,
        "We tried more than one analysis model, but the service is still busy. You were not charged. Please wait a few minutes and try again.",
        503,
        { "Retry-After": "10" },
      );
    }

    if (process.env.DEPLOY_CONTEXT === "deploy-preview") {
      const status =
        typeof error === "object" && error !== null
          ? Reflect.get(error, "status")
          : undefined;
      return jsonResponse(
        requestId,
        {
          error: "We could not analyze this contract. Please try again.",
          request_id: requestId,
          diagnostic: {
            error_name: error instanceof Error ? error.name : typeof error,
            status:
              typeof status === "number" && Number.isFinite(status)
                ? status
                : null,
          },
        },
        { status: 500, headers: { "Cache-Control": "no-store" } },
      );
    }

    return errorResponse(requestId, "We could not analyze this contract. Please try again.", 500);
  }
}
