import { describe, expect, it } from "vitest";

import { completedCheckoutUnlocksReport } from "./stripe-checkout-completion";

describe("completed Checkout report unlock", () => {
  it.each(["paid", "no_payment_required"] as const)(
    "accepts Stripe's completed %s state",
    (paymentStatus) => {
      expect(completedCheckoutUnlocksReport({ payment_status: paymentStatus }))
        .toBe(true);
    },
  );

  it("rejects an unpaid Checkout session", () => {
    expect(completedCheckoutUnlocksReport({ payment_status: "unpaid" }))
      .toBe(false);
  });
});
