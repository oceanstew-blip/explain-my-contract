import "server-only";

import { z } from "zod";

import { verifyContractAccessToken } from "@/lib/contract-access-token";
import {
  errorResponse,
  getRequestId,
  jsonResponse,
  logServerFailure,
} from "@/lib/request-observability";
import { getCheckoutEnvironment } from "@/lib/server-env";
import { canStartCheckout } from "@/lib/payment-status";
import { checkoutPriceIdForPageCount } from "@/lib/checkout-pricing";
import { createBetaCheckoutCustomerSettings } from "@/lib/beta-checkout-settings";
import { createStripe } from "@/lib/stripe";
import {
  addCalendarYears,
  isReportExpired,
  parseReportExpiration,
} from "@/lib/report-retention";
import { createSupabaseAdmin } from "@/lib/supabase-admin";

export const runtime = "nodejs";

const requestSchema = z
  .object({
    contract_id: z.uuid(),
    checkout_token: z.string().min(1).max(2_048),
  })
  .strict();

export async function POST(request: Request): Promise<Response> {
  const requestId = getRequestId(request.headers);
  try {
    const environment = getCheckoutEnvironment();
    const parsed = requestSchema.safeParse(await request.json());
    if (!parsed.success) {
      return errorResponse(requestId, "Invalid checkout request.", 400);
    }

    const { contract_id: contractId, checkout_token: checkoutToken } =
      parsed.data;
    if (
      !verifyContractAccessToken(
        checkoutToken,
        contractId,
        environment.CHECKOUT_TOKEN_SECRET,
      )
    ) {
      return errorResponse(
        requestId,
        "This checkout link is invalid or expired.",
        403,
      );
    }
    const supabase = createSupabaseAdmin(
      environment.NEXT_PUBLIC_SUPABASE_URL,
      environment.SUPABASE_SECRET_KEY,
    );
    const { data: contract, error } = await supabase
      .from("contracts")
      .select(
        "id, page_count, payment_status, stripe_session_id, stripe_checkout_version, report_expires_at, report_expired_at",
      )
      .eq("id", contractId)
      .single();

    if (error || !contract) {
      return errorResponse(requestId, "Contract not found.", 404);
    }
    if (!canStartCheckout(contract.payment_status)) {
      return errorResponse(
        requestId,
        "Checkout is not available for this report.",
        409,
      );
    }
    if (
      contract.report_expired_at !== null ||
      isReportExpired(contract.report_expires_at)
    ) {
      return errorResponse(
        requestId,
        "Checkout is not available because this report has expired.",
        410,
      );
    }
    const reportExpiration = parseReportExpiration(contract.report_expires_at);
    if (reportExpiration.getTime() - Date.now() < 30 * 60 * 1_000) {
      return errorResponse(
        requestId,
        "Checkout is not available this close to report expiration.",
        410,
      );
    }

    const stripe = createStripe(environment.STRIPE_SECRET_KEY);
    if (contract.stripe_session_id) {
      const existing = await stripe.checkout.sessions.retrieve(
        contract.stripe_session_id,
      );
      if (existing.status === "open" && existing.url) {
        return jsonResponse(
          requestId,
          { url: existing.url },
          { headers: { "Cache-Control": "no-store" } },
        );
      }
    }

    const version = Number(contract.stripe_checkout_version ?? 0) + 1;
    const priceId = checkoutPriceIdForPageCount(contract.page_count, {
      short: environment.STRIPE_PRICE_ID_SHORT,
      standard: environment.STRIPE_PRICE_ID_STANDARD,
      extended: environment.STRIPE_PRICE_ID_EXTENDED,
      long: environment.STRIPE_PRICE_ID_LONG,
    });
    const checkout = await stripe.checkout.sessions.create(
      {
        mode: "payment",
        allow_promotion_codes: true,
        ...createBetaCheckoutCustomerSettings(),
        invoice_creation: { enabled: true },
        client_reference_id: contractId,
        line_items: [{ price: priceId, quantity: 1 }],
        metadata: { contract_id: contractId },
        payment_intent_data: { metadata: { contract_id: contractId } },
        expires_at: Math.floor(reportExpiration.getTime() / 1_000),
        success_url: `${environment.APP_BASE_URL}/report/${contractId}?payment=success`,
        cancel_url: `${environment.APP_BASE_URL}/report/${contractId}?payment=cancelled`,
        custom_text: {
          submit: {
            message:
              "Beta tester? Add your promo code before completing checkout.",
          },
        },
      },
      { idempotencyKey: `contract-checkout:${contractId}:${version}` },
    );

    if (!checkout.url) throw new Error("Stripe did not return a checkout URL.");

    const { data: updatedContract, error: updateError } = await supabase
      .from("contracts")
      .update({
        payment_status: "checkout_open",
        stripe_checkout_version: version,
        stripe_session_id: checkout.id,
        financial_records_expires_at: addCalendarYears(new Date(), 7).toISOString(),
      })
      .eq("id", contractId)
      .eq("stripe_checkout_version", contract.stripe_checkout_version ?? 0)
      .select("id")
      .maybeSingle();

    if (updateError || !updatedContract) {
      throw new Error(
        `Could not save checkout: ${updateError?.message ?? "concurrent checkout request"}`,
      );
    }

    return jsonResponse(
      requestId,
      { url: checkout.url },
      { status: 201, headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errorResponse(
        requestId,
        "Payments are not configured yet.",
        503,
      );
    }
    logServerFailure({
      event: "checkout_creation_failed",
      requestId,
      route: "/api/checkout",
      error,
    });
    return errorResponse(
      requestId,
      "Checkout is temporarily unavailable.",
      503,
    );
  }
}
