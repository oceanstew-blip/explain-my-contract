import { describe, expect, it } from "vitest";

import {
  checkoutPriceIdForPageCount,
  checkoutPriceTierForPageCount,
} from "./checkout-pricing";

describe("checkout pricing", () => {
  it.each([1, 2, 5])("uses the short-contract price for %s pages", (pageCount) => {
    expect(checkoutPriceTierForPageCount(pageCount)).toBe("short");
  });

  it.each([6, 7, 12])("uses the standard price for %s pages", (pageCount) => {
    expect(checkoutPriceTierForPageCount(pageCount)).toBe("standard");
  });

  it.each([13, 18, 25])("uses the extended price for %s pages", (pageCount) => {
    expect(checkoutPriceTierForPageCount(pageCount)).toBe("extended");
  });

  it.each([26, 50, 100])("uses the long price for %s pages", (pageCount) => {
    expect(checkoutPriceTierForPageCount(pageCount)).toBe("long");
  });

  it.each([0, -1, 1.5, Number.NaN, Infinity])("rejects an invalid page count of %s", (pageCount) => {
    expect(() => checkoutPriceTierForPageCount(pageCount)).toThrow(
      "A positive whole-number page count is required.",
    );
  });

  it.each([
    [1, "price_short"], [5, "price_short"],
    [6, "price_standard"], [12, "price_standard"],
    [13, "price_extended"], [25, "price_extended"],
    [26, "price_long"], [100, "price_long"],
  ])("selects the configured price for %s pages", (pageCount, expected) => {
    expect(checkoutPriceIdForPageCount(pageCount as number, {
      short: "price_short",
      standard: "price_standard",
      extended: "price_extended",
      long: "price_long",
    })).toBe(expected);
  });
});
