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

  it("does not request a payment method when the beta promotion reduces the total to zero", () => {
    expect(createBetaCheckoutCustomerSettings().payment_method_collection).toBe(
      "if_required",
    );
  });
});
