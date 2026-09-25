import type Stripe from "stripe";

/**
 * Required contact details for the invite-only, 100%-off beta Checkout flow.
 * A payment method is collected only when Stripe determines it is required;
 * invited testers must verify that their promotion code reduces the total to $0.
 */
export function createBetaCheckoutCustomerSettings(): Pick<
  Stripe.Checkout.SessionCreateParams,
  | "customer_creation"
  | "name_collection"
  | "payment_method_collection"
  | "phone_number_collection"
  | "wallet_options"
> {
  return {
    customer_creation: "always",
    name_collection: { individual: { enabled: true, optional: false } },
    payment_method_collection: "if_required",
    phone_number_collection: { enabled: false },
    wallet_options: { link: { display: "never" } },
  };
}
