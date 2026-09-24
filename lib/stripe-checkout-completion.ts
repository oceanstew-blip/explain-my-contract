import type Stripe from "stripe";

export function completedCheckoutUnlocksReport(
  session: Pick<Stripe.Checkout.Session, "payment_status">,
): boolean {
  return session.payment_status === "paid" ||
    session.payment_status === "no_payment_required";
}
