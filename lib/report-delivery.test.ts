import { describe, expect, it } from "vitest";

import { createReportDelivery } from "./report-delivery";

const fullReport = {
  agreement_snapshot: {
    agreement_type: "Service agreement",
    provider: "Example Co.",
    term: "12 months",
    what_you_get: ["Design services"],
    what_you_pay: ["$1,000"],
    what_you_commit_to: ["Provide feedback"],
  },
  total_flags: 1,
  categories_found: ["Indemnification"],
  detailed_analysis: [
    {
      headline: "Uncapped indemnity",
      legal_gibberish: "Paid translation",
      danger: "Paid consequence",
      fix: "Paid next step",
      location: "Section 8",
    },
  ],
};

const baseInput = {
  contractId: "5c4ac1ca-9408-43e7-8836-02cd09958a49",
  intent: "considering_signing",
  fullReport,
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
    expect(JSON.stringify(delivery.preview)).not.toContain("Paid translation");
  });

  it("includes the full report after payment and stops issuing checkout access", () => {
    const delivery = createReportDelivery({
      ...baseInput,
      paymentStatus: "paid",
    });

    expect(delivery).toHaveProperty("report", fullReport);
    expect(delivery).not.toHaveProperty("checkout_token");
    expect(delivery.checkout_enabled).toBe(false);
  });

  it("never issues checkout capability while checkout is disabled", () => {
    const delivery = createReportDelivery({
      ...baseInput,
      paymentStatus: "unpaid",
      checkoutEnabled: false,
    });

    expect(delivery.checkout_enabled).toBe(false);
    expect(delivery).not.toHaveProperty("checkout_token");
  });

  it("does not reopen checkout automatically for refunded reports", () => {
    const delivery = createReportDelivery({
      ...baseInput,
      paymentStatus: "refunded",
    });

    expect(delivery.paid).toBe(false);
    expect(delivery.checkout_enabled).toBe(false);
    expect(delivery).not.toHaveProperty("checkout_token");
  });

  it.each([
    ["missing report", null],
    ["malformed report", { ...fullReport, detailed_analysis: [] }],
  ])("fails closed for a %s", (_label, invalidReport) => {
    expect(() =>
      createReportDelivery({
        ...baseInput,
        paymentStatus: "paid",
        fullReport: invalidReport,
      }),
    ).toThrow();
  });

  it("fails closed for an unknown payment state", () => {
    expect(() =>
      createReportDelivery({
        ...baseInput,
        paymentStatus: "mystery",
      }),
    ).toThrow();
  });
});
