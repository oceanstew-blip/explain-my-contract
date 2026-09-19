import { describe, expect, it } from "vitest";

import { hasAcknowledgedAnalysisDisclaimer } from "./analysis-disclaimer";

describe("analysis disclaimer acknowledgement", () => {
  it("accepts only the explicit true value", () => {
    expect(hasAcknowledgedAnalysisDisclaimer("true")).toBe(true);
  });

  it.each([null, "", "false", "yes", "TRUE"])(
    "rejects %s",
    (value) => {
      expect(hasAcknowledgedAnalysisDisclaimer(value)).toBe(false);
    },
  );
});
