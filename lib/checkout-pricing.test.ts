import { describe, expect, it } from "vitest";

import {
  checkoutPriceIdForPageCount,
  checkoutPriceTierForPageCount,
} from "./checkout-pricing";

describe("checkout pricing", () => {
  it.each([1, 2, 5])("uses the short-contract price for %s pages", (pageCount) => {
    expect(checkoutPriceTierForPageCount(pageCount)).toBe("short");
  });

  it.each([6, 12, 50])("uses the standard price for %s pages", (pageCount) => {
    expect(checkoutPriceTierForPageCount(pageCount)).toBe("standard");
  });

  it.each([0, -1, 1.5, Number.NaN])("rejects an invalid page count of %s", (pageCount) => {
    expect(() => checkoutPriceTierForPageCount(pageCount)).toThrow(
      "A positive whole-number page count is required.",
    );
  });

  it("returns only a server-provided Stripe Price ID", () => {
    expect(
      checkoutPriceIdForPageCount(5, {
        short: "price_short",
        standard: "price_standard",
      }),
    ).toBe("price_short");
    expect(
      checkoutPriceIdForPageCount(6, {
        short: "price_short",
        standard: "price_standard",
      }),
    ).toBe("price_standard");
  });
});
