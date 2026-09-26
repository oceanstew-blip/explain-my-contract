import { describe, expect, it } from "vitest";

import { apiErrorMessage, readApiJson } from "./api-error";

describe("readApiJson", () => {
  it("replaces an HTML gateway error with retry guidance and a safe support ID", async () => {
    await expect(readApiJson(new Response("<HTML><HEAD>Gateway timeout</HEAD></HTML>", {
      status: 504, headers: { "x-request-id": "request_123456" },
    }), "Analysis is temporarily unavailable. Try again.")).rejects.toThrow(
      "Analysis is temporarily unavailable. Try again. Support ID: request_123456",
    );
  });
  it.each(["null", "[]", "\"unexpected\""])("handles malformed JSON payload shape %s", async (body) => {
    await expect(readApiJson(new Response(body), "Try again.")).rejects.toThrow("Try again.");
  });
  it("preserves structured errors for the normal API error handler", async () => {
    const body = { error: "Too many attempts.", request_id: "request_123456" };
    await expect(readApiJson(Response.json(body, { status: 429 }), "Fallback")).resolves.toEqual(body);
  });
});

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
