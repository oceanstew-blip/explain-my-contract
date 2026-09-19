import type Stripe from "stripe";
import { describe, expect, it, vi } from "vitest";

import { paymentStateChangeFromEvent } from "./stripe-payment-state";

function event(type: Stripe.Event.Type, object: unknown): Stripe.Event {
  return { type, data: { object } } as Stripe.Event;
}

describe("Stripe payment state events", () => {
  const retrieveCharge = vi.fn();

  it.each([
    "checkout.session.async_payment_failed",
    "checkout.session.expired",
  ] as const)("maps %s to a session-scoped failure", async (type) => {
    await expect(
      paymentStateChangeFromEvent(
        event(type, { id: "cs_test_failure" }),
        retrieveCharge,
      ),
    ).resolves.toEqual({
      sessionId: "cs_test_failure",
      targetStatus: "failed",
    });
  });

  it("records partial refunds without revoking paid access", async () => {
    await expect(
      paymentStateChangeFromEvent(
        event("charge.refunded", {
          id: "ch_partial",
          payment_intent: "pi_paid",
          refunded: false,
        }),
        retrieveCharge,
      ),
    ).resolves.toEqual({
      paymentIntentId: "pi_paid",
      targetStatus: "unchanged",
    });
  });

  it("maps a full refund to the PaymentIntent", async () => {
    await expect(
      paymentStateChangeFromEvent(
        event("charge.refunded", {
          id: "ch_full",
          payment_intent: "pi_paid",
          refunded: true,
        }),
        retrieveCharge,
      ),
    ).resolves.toEqual({
      paymentIntentId: "pi_paid",
      targetStatus: "refunded",
    });
  });

  it("uses the dispute PaymentIntent without another Stripe request", async () => {
    const change = await paymentStateChangeFromEvent(
      event("charge.dispute.created", {
        id: "du_active",
        charge: "ch_paid",
        payment_intent: "pi_paid",
      }),
      retrieveCharge,
    );

    expect(change).toEqual({
      paymentIntentId: "pi_paid",
      targetStatus: "disputed",
    });
    expect(retrieveCharge).not.toHaveBeenCalled();
  });

  it("falls back to the dispute charge when PaymentIntent is absent", async () => {
    retrieveCharge.mockResolvedValueOnce({
      id: "ch_paid",
      payment_intent: "pi_from_charge",
    } as Stripe.Charge);

    await expect(
      paymentStateChangeFromEvent(
        event("charge.dispute.created", {
          id: "du_active",
          charge: "ch_paid",
          payment_intent: null,
        }),
        retrieveCharge,
      ),
    ).resolves.toEqual({
      paymentIntentId: "pi_from_charge",
      targetStatus: "disputed",
    });
  });

  it.each(["won", "warning_closed", "prevented"] as const)(
    "restores paid state when a dispute closes as %s",
    async (status) => {
      await expect(
        paymentStateChangeFromEvent(
          event("charge.dispute.closed", {
            id: "du_closed",
            charge: "ch_paid",
            payment_intent: "pi_paid",
            status,
          }),
          retrieveCharge,
        ),
      ).resolves.toEqual({
        paymentIntentId: "pi_paid",
        targetStatus: "paid",
      });
    },
  );

  it("keeps access blocked when a dispute closes as lost", async () => {
    await expect(
      paymentStateChangeFromEvent(
        event("charge.dispute.closed", {
          id: "du_lost",
          charge: "ch_paid",
          payment_intent: "pi_paid",
          status: "lost",
        }),
        retrieveCharge,
      ),
    ).resolves.toEqual({
      paymentIntentId: "pi_paid",
      targetStatus: "disputed",
    });
  });
});
