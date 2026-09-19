import { z } from "zod";

export const paymentStatusSchema = z.enum([
  "unpaid",
  "checkout_open",
  "paid",
  "failed",
  "refunded",
  "disputed",
]);

export type PaymentStatus = z.infer<typeof paymentStatusSchema>;

export function canStartCheckout(status: unknown): boolean {
  const parsed = paymentStatusSchema.safeParse(status);
  return (
    parsed.success &&
    ["unpaid", "checkout_open", "failed"].includes(parsed.data)
  );
}
