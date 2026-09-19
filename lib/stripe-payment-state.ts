import type Stripe from "stripe";

export type PaymentStateChange = {
  paymentIntentId?: string;
  sessionId?: string;
  targetStatus: "failed" | "refunded" | "disputed" | "paid" | "unchanged";
};

type RetrieveCharge = (chargeId: string) => Promise<Stripe.Charge>;

function stripeId(value: string | { id: string } | null): string | undefined {
  if (typeof value === "string") return value;
  return value?.id;
}

async function disputePaymentIntentId(
  dispute: Stripe.Dispute,
  retrieveCharge: RetrieveCharge,
): Promise<string> {
  const directPaymentIntentId = stripeId(dispute.payment_intent);
  if (directPaymentIntentId) return directPaymentIntentId;

  const chargeId = stripeId(dispute.charge);
  if (!chargeId) throw new Error("Stripe dispute is missing a charge reference.");

  const charge = await retrieveCharge(chargeId);
  const paymentIntentId = stripeId(charge.payment_intent);
  if (!paymentIntentId) {
    throw new Error("Stripe dispute charge is missing a PaymentIntent.");
  }
  return paymentIntentId;
}

export async function paymentStateChangeFromEvent(
  event: Stripe.Event,
  retrieveCharge: RetrieveCharge,
): Promise<PaymentStateChange | null> {
  if (
    event.type === "checkout.session.async_payment_failed" ||
    event.type === "checkout.session.expired"
  ) {
    return { sessionId: event.data.object.id, targetStatus: "failed" };
  }

  if (event.type === "charge.refunded") {
    const charge = event.data.object;
    const paymentIntentId = stripeId(charge.payment_intent);
    if (!paymentIntentId) {
      throw new Error("Refunded Stripe charge is missing a PaymentIntent.");
    }
    return {
      paymentIntentId,
      targetStatus: charge.refunded ? "refunded" : "unchanged",
    };
  }

  if (event.type === "charge.dispute.created") {
    return {
      paymentIntentId: await disputePaymentIntentId(
        event.data.object,
        retrieveCharge,
      ),
      targetStatus: "disputed",
    };
  }

  if (event.type === "charge.dispute.closed") {
    const dispute = event.data.object;
    if (
      !["won", "warning_closed", "prevented"].includes(dispute.status)
    ) {
      return {
        paymentIntentId: await disputePaymentIntentId(dispute, retrieveCharge),
        targetStatus: "disputed",
      };
    }

    return {
      paymentIntentId: await disputePaymentIntentId(dispute, retrieveCharge),
      targetStatus: "paid",
    };
  }

  return null;
}
