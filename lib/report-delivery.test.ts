import { describe, expect, it } from "vitest";

import { createReportDelivery } from "./report-delivery";

const baseInput = {
  contractId: "5c4ac1ca-9408-43e7-8836-02cd09958a49",
  intent: "considering_signing",
  preview: { total_flags: 1 },
  fullReport: { secret_paid_explanation: "Only paid users receive this." },
  checkoutEnabled: true,
  checkoutToken: "checkout-capability",
};

describe("report delivery policy", () => {
  it("never includes the full report before payment", () => {
    const delivery = createReportDelivery({
      ...baseInput,
      paymentStatus: "checkout_open",
    });

    expect(delivery).not.toHaveProperty("report");
    expect(delivery).toHaveProperty("checkout_token", "checkout-capability");
  });

  it("includes the full report after payment and stops issuing checkout access", () => {
    const delivery = createReportDelivery({
      ...baseInput,
      paymentStatus: "paid",
    });

    expect(delivery).toHaveProperty("report", baseInput.fullReport);
    expect(delivery).not.toHaveProperty("checkout_token");
  });
});
