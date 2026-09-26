export const CHECKOUT_PRICE_TIERS = [
  { tier: "short", maxPages: 5, pages: "1–5 pages", amount: 5 },
  { tier: "standard", maxPages: 12, pages: "6–12 pages", amount: 12 },
  { tier: "extended", maxPages: 25, pages: "13–25 pages", amount: 22 },
  { tier: "long", maxPages: Infinity, pages: "26+ pages", amount: 28 },
] as const;

export type CheckoutPriceTier = (typeof CHECKOUT_PRICE_TIERS)[number]["tier"];

export function checkoutPriceTierForPageCount(
  pageCount: number,
): CheckoutPriceTier {
  if (!Number.isInteger(pageCount) || pageCount < 1) {
    throw new Error("A positive whole-number page count is required.");
  }

  return CHECKOUT_PRICE_TIERS.find(({ maxPages }) => pageCount <= maxPages)!.tier;
}

export function checkoutPriceIdForPageCount(
  pageCount: number,
  prices: Record<CheckoutPriceTier, string>,
): string {
  return prices[checkoutPriceTierForPageCount(pageCount)];
}
