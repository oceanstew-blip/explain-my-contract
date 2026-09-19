import { describe, expect, it, vi } from "vitest";

import {
  errorResponse,
  getRequestId,
  jsonResponse,
  logServerFailure,
} from "./request-observability";

describe("request observability", () => {
  it("preserves a safe request ID and replaces unsafe values", () => {
    expect(getRequestId(new Headers({ "x-request-id": "edge_ABC-1234" }))).toBe(
      "edge_ABC-1234",
    );
    expect(getRequestId(new Headers({ "x-request-id": "<script>" }))).toMatch(
      /^[0-9a-f-]{36}$/,
    );
  });

  it("adds the request ID to success and error responses", async () => {
    const success = jsonResponse("request_123", { ok: true });
    expect(success.headers.get("x-request-id")).toBe("request_123");

    const failure = errorResponse("request_123", "Nope", 400);
    expect(failure.status).toBe(400);
    expect(failure.headers.get("cache-control")).toBe("no-store");
    await expect(failure.json()).resolves.toEqual({
      error: "Nope",
      request_id: "request_123",
    });
  });

  it("logs correlation data without error messages or stacks", () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    const error = Object.assign(new Error("contract text must stay private"), {
      code: "DB_DOWN",
      status: 503,
    });

    logServerFailure({
      event: "analysis_failed",
      requestId: "request_123",
      route: "/api/analyze",
      error,
    });

    expect(consoleError).toHaveBeenCalledWith({
      event: "analysis_failed",
      request_id: "request_123",
      route: "/api/analyze",
      error_name: "Error",
      error_code: "DB_DOWN",
      error_status: 503,
    });
    expect(JSON.stringify(consoleError.mock.calls)).not.toContain(
      "contract text must stay private",
    );
  });
});
