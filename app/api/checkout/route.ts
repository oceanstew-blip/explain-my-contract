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
import { createStripe } from "@/lib/stripe";
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
        "id, payment_status, stripe_session_id, stripe_checkout_version",
      )
      .eq("id", contractId)
      .single();

    if (error || !contract) {
      return errorResponse(requestId, "Contract not found.", 404);
    }
    if (contract.payment_status === "paid") {
      return errorResponse(
        requestId,
        "This report has already been paid for.",
        409,
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
    const checkout = await stripe.checkout.sessions.create(
      {
        mode: "payment",
        client_reference_id: contractId,
        line_items: [{ price: environment.STRIPE_PRICE_ID, quantity: 1 }],
        metadata: { contract_id: contractId },
        payment_intent_data: { metadata: { contract_id: contractId } },
        success_url: `${environment.APP_BASE_URL}/report/${contractId}?payment=success`,
        cancel_url: `${environment.APP_BASE_URL}/report/${contractId}?payment=cancelled`,
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
