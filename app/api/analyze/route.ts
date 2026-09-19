import "server-only";
import "pdf-parse/worker";

import { GoogleGenAI } from "@google/genai";
import { PDFParse } from "pdf-parse";
import { z } from "zod";

import {
  createAnalysisPreview,
  getAnalysisConfig,
  validateAnalysisResult,
} from "@/lib/analysis-config";
import { hasAcknowledgedAnalysisDisclaimer } from "@/lib/analysis-disclaimer";
import { analysisIntentSchema } from "@/lib/analysis-intent";
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
  isRetryableGeminiError,
  withGeminiRetry,
} from "@/lib/gemini-retry";
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

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;
const MAX_EXTRACTED_CHARACTERS = 750_000;

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
    if (
      typeof turnstileToken !== "string" ||
      !(await verifyTurnstileToken({
        token: turnstileToken,
        secret: environment.TURNSTILE_SECRET,
        expectedAction: "analyze_contract",
        expectedHostnames: parseTurnstileHostnames(
          environment.TURNSTILE_HOSTNAMES,
        ),
        remoteIp,
        testMode: environment.TURNSTILE_TEST_MODE === "true",
      }))
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

    const analysisConfig = getAnalysisConfig(intent);

    const gemini = new GoogleGenAI({
      apiKey: environment.GEMINI_API_KEY,
    });
    const geminiModels = getGeminiModelCandidates(environment.GEMINI_MODEL);

    const validatedResult = await withGeminiRetry(
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
            systemInstruction: analysisConfig.systemPrompt,
            temperature: 0,
            maxOutputTokens: 8_000,
            responseMimeType: "application/json",
            responseJsonSchema: analysisConfig.jsonSchema,
          },
        });

        return parseAndValidateGeminiOutput(
          geminiResponse.text,
          (value) => validateAnalysisResult(intent, value),
        );
      },
      {
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

    const preview = createAnalysisPreview(validatedResult);
    const recoveryToken = createReportRecoveryToken();

    const { data: contractId, error: contractError } = await supabaseAdmin.rpc(
      "create_contract_analysis",
      {
        p_file_name: sanitizeFileName(uploadedValue.name),
        p_full_report: validatedResult,
        p_page_count: pageCount,
        p_recovery_token_hash: hashReportRecoveryToken(recoveryToken),
        p_intent: intent,
        p_tease_summary: preview,
      },
    );

    if (contractError || typeof contractId !== "string") {
      throw new Error(
        `Could not create contract and analysis records: ${
          contractError?.message ?? "unknown database error"
        }`,
      );
    }

    const checkoutTokenSecret = process.env.CHECKOUT_TOKEN_SECRET?.trim();

    return jsonResponse(
      requestId,
      {
        contract_id: contractId,
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
    logServerFailure({
      event: "analysis_failed",
      requestId,
      route: "/api/analyze",
      error,
    });

    if (error instanceof z.ZodError) {
      return errorResponse(
        requestId,
        "The analysis service returned an unexpected result.",
        502,
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

    if (isRetryableGeminiError(error)) {
      return errorResponse(
        requestId,
        "The analysis service is temporarily busy. Please try again shortly.",
        503,
        { "Retry-After": "10" },
      );
    }

    return errorResponse(
      requestId,
      "We could not analyze this contract. Please try again.",
      500,
    );
  }
}
