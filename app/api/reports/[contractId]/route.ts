import "server-only";

import { z } from "zod";

import { createContractAccessToken } from "@/lib/contract-access-token";
import {
  errorResponse,
  getRequestId,
  jsonResponse,
  logServerFailure,
} from "@/lib/request-observability";
import {
  hashReportRecoveryToken,
  verifyReportRecoveryToken,
} from "@/lib/report-access";
import {
  deleteUnpaidReport,
  ReportDeletionUnavailableError,
} from "@/lib/report-deletion";
import { createReportDelivery } from "@/lib/report-delivery";
import { isReportExpired } from "@/lib/report-retention";
import { getReportEnvironment } from "@/lib/server-env";
import { createSupabaseAdmin } from "@/lib/supabase-admin";

export const runtime = "nodejs";

const contractIdSchema = z.uuid();

function recoveryTokenFrom(request: Request): string {
  const authorization = request.headers.get("authorization") ?? "";
  return authorization.startsWith("Bearer ") ? authorization.slice(7) : "";
}

export async function GET(
  request: Request,
  context: { params: Promise<{ contractId: string }> },
): Promise<Response> {
  const requestId = getRequestId(request.headers);
  const { contractId: rawContractId } = await context.params;
  const parsedContractId = contractIdSchema.safeParse(rawContractId);
  const recoveryToken = recoveryTokenFrom(request);

  if (!parsedContractId.success || !recoveryToken) {
    return errorResponse(requestId, "This report link is invalid.", 403);
  }

  try {
    const environment = getReportEnvironment();
    const supabase = createSupabaseAdmin(
      environment.NEXT_PUBLIC_SUPABASE_URL,
      environment.SUPABASE_SECRET_KEY,
    );
    const contractId = parsedContractId.data;
    const { data: contract, error: contractError } = await supabase
      .from("contracts")
      .select("id, payment_status, recovery_token_hash, report_expires_at, report_expired_at")
      .eq("id", contractId)
      .single();

    if (
      contractError ||
      !contract ||
      typeof contract.recovery_token_hash !== "string" ||
      !verifyReportRecoveryToken(recoveryToken, contract.recovery_token_hash)
    ) {
      return errorResponse(requestId, "This report link is invalid.", 403);
    }
    if (
      contract.report_expired_at !== null ||
      isReportExpired(contract.report_expires_at)
    ) {
      return errorResponse(
        requestId,
        "This report has expired and its analysis is no longer available.",
        410,
      );
    }

    const { data: analysis, error: analysisError } = await supabase
      .from("analyses")
      .select("intent, full_report")
      .eq("contract_id", contractId)
      .single();

    if (analysisError || !analysis) {
      throw new Error(
        `Could not retrieve analysis: ${analysisError?.message ?? "missing analysis"}`,
      );
    }

    const checkoutEnabled = process.env.STRIPE_CHECKOUT_ENABLED === "true";
    const includeFullReportPreview =
      process.env.NODE_ENV === "development" &&
      process.env.LOCAL_FULL_REPORT_PREVIEW === "true";
    const checkoutTokenSecret = process.env.CHECKOUT_TOKEN_SECRET?.trim();
    const checkoutToken =
      checkoutEnabled && checkoutTokenSecret && checkoutTokenSecret.length >= 32
        ? createContractAccessToken(contractId, checkoutTokenSecret)
        : undefined;

    return jsonResponse(
      requestId,
      createReportDelivery({
        contractId,
        intent: analysis.intent,
        paymentStatus: contract.payment_status,
        fullReport: analysis.full_report,
        checkoutEnabled,
        checkoutToken,
        reportExpiresAt: contract.report_expires_at,
        includeFullReportPreview,
      }),
      { headers: { "Cache-Control": "no-store, private" } },
    );
  } catch (error) {
    logServerFailure({
      event: "report_recovery_failed",
      requestId,
      route: "/api/reports/[contractId]",
      error,
    });
    return errorResponse(
      requestId,
      "The report could not be retrieved.",
      500,
    );
  }
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ contractId: string }> },
): Promise<Response> {
  const requestId = getRequestId(request.headers);
  const { contractId: rawContractId } = await context.params;
  const parsedContractId = contractIdSchema.safeParse(rawContractId);
  const recoveryToken = recoveryTokenFrom(request);

  if (!parsedContractId.success || !recoveryToken) {
    return errorResponse(requestId, "This report link is invalid.", 403);
  }

  try {
    const environment = getReportEnvironment();
    const supabase = createSupabaseAdmin(
      environment.NEXT_PUBLIC_SUPABASE_URL,
      environment.SUPABASE_SECRET_KEY,
    );
    const result = await deleteUnpaidReport(supabase, {
      contractId: parsedContractId.data,
      recoveryTokenHash: hashReportRecoveryToken(recoveryToken),
    });

    if (result === "invalid") {
      return errorResponse(requestId, "This report link is invalid.", 403);
    }
    if (result === "protected") {
      return errorResponse(
        requestId,
        "Reports connected to payment activity require support-assisted deletion.",
        409,
      );
    }

    return jsonResponse(
      requestId,
      { deleted: true },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    logServerFailure({
      event: "report_deletion_failed",
      requestId,
      route: "/api/reports/[contractId]",
      error,
    });
    return errorResponse(
      requestId,
      error instanceof ReportDeletionUnavailableError
        ? "Report deletion is temporarily unavailable."
        : "The report could not be deleted.",
      503,
    );
  }
}
