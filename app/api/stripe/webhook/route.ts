import "server-only";

import type Stripe from "stripe";

import {
  errorResponse,
  getRequestId,
  jsonResponse,
  logServerFailure,
} from "@/lib/request-observability";
import { getStripeWebhookEnvironment } from "@/lib/server-env";
import { createStripe } from "@/lib/stripe";
import { paymentStateChangeFromEvent } from "@/lib/stripe-payment-state";
import { createSupabaseAdmin } from "@/lib/supabase-admin";

export const runtime = "nodejs";

function paidCheckoutSession(event: Stripe.Event): Stripe.Checkout.Session | null {
  if (
    event.type !== "checkout.session.completed" &&
    event.type !== "checkout.session.async_payment_succeeded"
  ) {
    return null;
  }

  const session = event.data.object;
  return session.payment_status === "paid" ? session : null;
}

export async function POST(request: Request): Promise<Response> {
  const requestId = getRequestId(request.headers);
  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return errorResponse(requestId, "Missing Stripe signature.", 400);
  }

  let environment: ReturnType<typeof getStripeWebhookEnvironment>;
  let event: Stripe.Event;
  let stripe: ReturnType<typeof createStripe>;

  try {
    environment = getStripeWebhookEnvironment();
    stripe = createStripe(environment.STRIPE_SECRET_KEY);
    event = stripe.webhooks.constructEvent(
      await request.text(),
      signature,
      environment.STRIPE_WEBHOOK_SECRET,
    );
  } catch (error) {
    logServerFailure({
      level: "warn",
      event: "stripe_signature_verification_failed",
      requestId,
      route: "/api/stripe/webhook",
      error,
    });
    return errorResponse(requestId, "Invalid Stripe signature.", 400);
  }

  try {
    const session = paidCheckoutSession(event);
    const supabase = createSupabaseAdmin(
      environment.NEXT_PUBLIC_SUPABASE_URL,
      environment.SUPABASE_SECRET_KEY,
    );

    if (session) {
      const contractId = session.metadata?.contract_id;
      if (!contractId || contractId !== session.client_reference_id) {
        return errorResponse(
          requestId,
          "Checkout session is missing contract metadata.",
          400,
        );
      }

      const { error } = await supabase.rpc("record_paid_checkout", {
        p_contract_id: contractId,
        p_event_id: event.id,
        p_event_type: event.type,
        p_payment_intent_id:
          typeof session.payment_intent === "string"
            ? session.payment_intent
            : session.payment_intent?.id ?? null,
        p_session_id: session.id,
      });

      if (error) throw new Error(`Could not record payment: ${error.message}`);
      return jsonResponse(requestId, { received: true });
    }

    const stateChange = await paymentStateChangeFromEvent(
      event,
      (chargeId) => stripe.charges.retrieve(chargeId),
    );
    if (!stateChange) return jsonResponse(requestId, { received: true });

    const { error } = await supabase.rpc("record_payment_state_event", {
      p_event_id: event.id,
      p_event_type: event.type,
      p_payment_intent_id: stateChange.paymentIntentId ?? null,
      p_session_id: stateChange.sessionId ?? null,
      p_target_status: stateChange.targetStatus,
    });

    if (error) {
      throw new Error(`Could not record payment state: ${error.message}`);
    }
    return jsonResponse(requestId, { received: true });
  } catch (error) {
    logServerFailure({
      event: "stripe_webhook_processing_failed",
      requestId,
      route: "/api/stripe/webhook",
      error,
    });
    return errorResponse(
      requestId,
      "Webhook could not be processed.",
      500,
    );
  }
}
