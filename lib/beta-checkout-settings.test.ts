import { describe, expect, it } from "vitest";

import { createBetaCheckoutCustomerSettings } from "./beta-checkout-settings";

describe("beta Checkout customer settings", () => {
  it("requires a persistent customer and individual name without requesting phone details", () => {
    expect(createBetaCheckoutCustomerSettings()).toMatchObject({
      customer_creation: "always",
      name_collection: { individual: { enabled: true, optional: false } },
      phone_number_collection: { enabled: false },
    });
  });

  it("omits the subscription-only option that Stripe rejects for one-time reports", () => {
    expect(createBetaCheckoutCustomerSettings()).not.toHaveProperty("payment_method_collection");
  });
});
