import "server-only";

import type Stripe from "stripe";

import { getStripeWebhookEnvironment } from "@/lib/server-env";
import { createStripe } from "@/lib/stripe";
import { createSupabaseAdmin } from "@/lib/supabase-admin";

export const runtime = "nodejs";

function errorResponse(message: string, status: number): Response {
  return Response.json(
    { error: message },
    { status, headers: { "Cache-Control": "no-store" } },
  );
}

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
  const signature = request.headers.get("stripe-signature");
  if (!signature) return errorResponse("Missing Stripe signature.", 400);

  let environment: ReturnType<typeof getStripeWebhookEnvironment>;
  let event: Stripe.Event;

  try {
    environment = getStripeWebhookEnvironment();
    const stripe = createStripe(environment.STRIPE_SECRET_KEY);
    event = stripe.webhooks.constructEvent(
      await request.text(),
      signature,
      environment.STRIPE_WEBHOOK_SECRET,
    );
  } catch (error) {
    console.warn("Stripe webhook signature verification failed", { error });
    return errorResponse("Invalid Stripe signature.", 400);
  }

  try {
    const session = paidCheckoutSession(event);
    if (!session) return Response.json({ received: true });

    const contractId = session.metadata?.contract_id;
    if (!contractId || contractId !== session.client_reference_id) {
      return errorResponse("Checkout session is missing contract metadata.", 400);
    }

    const supabase = createSupabaseAdmin(
      environment.NEXT_PUBLIC_SUPABASE_URL,
      environment.SUPABASE_SECRET_KEY,
    );
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
    return Response.json({ received: true });
  } catch (error) {
    console.error("Stripe webhook processing failed", { error });
    return errorResponse("Webhook could not be processed.", 500);
  }
}
