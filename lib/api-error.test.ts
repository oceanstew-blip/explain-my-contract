import { describe, expect, it } from "vitest";

import { apiErrorMessage } from "./api-error";

describe("apiErrorMessage", () => {
  it("adds a validated support ID to an API error", () => {
    expect(
      apiErrorMessage(
        { error: "Try again.", request_id: "request_123456" },
        "Fallback",
      ),
    ).toBe("Try again. Support ID: request_123456");
  });

  it("uses the fallback and ignores unsafe IDs", () => {
    expect(apiErrorMessage({ request_id: "<script>" }, "Fallback")).toBe(
      "Fallback",
    );
  });
});
