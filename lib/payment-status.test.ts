import { describe, expect, it } from "vitest";

import { canStartCheckout } from "./payment-status";

describe("payment status policy", () => {
  it.each(["unpaid", "checkout_open", "failed"])(
    "allows checkout from %s",
    (status) => {
      expect(canStartCheckout(status)).toBe(true);
    },
  );

  it.each(["paid", "refunded", "disputed", "unknown", null])(
    "blocks checkout from %s",
    (status) => {
      expect(canStartCheckout(status)).toBe(false);
    },
  );
});
