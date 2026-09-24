export type CheckoutPriceTier = "short" | "standard";

export function checkoutPriceTierForPageCount(
  pageCount: number,
): CheckoutPriceTier {
  if (!Number.isInteger(pageCount) || pageCount < 1) {
    throw new Error("A positive whole-number page count is required.");
  }

  return pageCount <= 5 ? "short" : "standard";
}

export function checkoutPriceIdForPageCount(
  pageCount: number,
  prices: { short: string; standard: string },
): string {
  return prices[checkoutPriceTierForPageCount(pageCount)];
}
