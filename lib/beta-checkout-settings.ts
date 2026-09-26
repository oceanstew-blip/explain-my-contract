import type Stripe from "stripe";

/**
 * Required contact details for the invite-only, 100%-off beta Checkout flow.
 * Stripe handles no-cost payment-mode orders without the subscription-only
 * payment_method_collection option. Testers must confirm their total is $0.
 */
export function createBetaCheckoutCustomerSettings(): Pick<
  Stripe.Checkout.SessionCreateParams,
  | "customer_creation"
  | "name_collection"
  | "phone_number_collection"
  | "wallet_options"
> {
  return {
    customer_creation: "always",
    name_collection: { individual: { enabled: true, optional: false } },
    phone_number_collection: { enabled: false },
    wallet_options: { link: { display: "never" } },
  };
}
