import "server-only";

import { z } from "zod";

import { createContractAccessToken } from "@/lib/contract-access-token";
import { verifyReportRecoveryToken } from "@/lib/report-access";
import { createReportDelivery } from "@/lib/report-delivery";
import { getReportEnvironment } from "@/lib/server-env";
import { createSupabaseAdmin } from "@/lib/supabase-admin";

export const runtime = "nodejs";

const contractIdSchema = z.uuid();

function errorResponse(message: string, status: number): Response {
  return Response.json(
    { error: message },
    { status, headers: { "Cache-Control": "no-store" } },
  );
}

export async function GET(
  request: Request,
  context: { params: Promise<{ contractId: string }> },
): Promise<Response> {
  const { contractId: rawContractId } = await context.params;
  const parsedContractId = contractIdSchema.safeParse(rawContractId);
  const authorization = request.headers.get("authorization") ?? "";
  const recoveryToken = authorization.startsWith("Bearer ")
    ? authorization.slice(7)
    : "";

  if (!parsedContractId.success || !recoveryToken) {
    return errorResponse("This report link is invalid.", 403);
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
      .select("id, payment_status, recovery_token_hash")
      .eq("id", contractId)
      .single();

    if (
      contractError ||
      !contract ||
      typeof contract.recovery_token_hash !== "string" ||
      !verifyReportRecoveryToken(recoveryToken, contract.recovery_token_hash)
    ) {
      return errorResponse("This report link is invalid.", 403);
    }

    const { data: analysis, error: analysisError } = await supabase
      .from("analyses")
      .select("intent, tease_summary, full_report")
      .eq("contract_id", contractId)
      .single();

    if (analysisError || !analysis) {
      throw new Error(
        `Could not retrieve analysis: ${analysisError?.message ?? "missing analysis"}`,
      );
    }

    const checkoutTokenSecret = process.env.CHECKOUT_TOKEN_SECRET?.trim();
    const checkoutToken =
      checkoutTokenSecret && checkoutTokenSecret.length >= 32
        ? createContractAccessToken(contractId, checkoutTokenSecret)
        : undefined;

    return Response.json(
      createReportDelivery({
        contractId,
        intent: analysis.intent,
        paymentStatus: contract.payment_status,
        preview: analysis.tease_summary,
        fullReport: analysis.full_report,
        checkoutEnabled: process.env.STRIPE_CHECKOUT_ENABLED === "true",
        checkoutToken,
      }),
      { headers: { "Cache-Control": "no-store, private" } },
    );
  } catch (error) {
    console.error("Report recovery failed", { error });
    return errorResponse("The report could not be retrieved.", 500);
  }
}
