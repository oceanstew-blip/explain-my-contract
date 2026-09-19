import { describe, expect, it, vi } from "vitest";

import {
  AnalysisRateLimitUnavailableError,
  consumeAnalysisRateLimit,
  getClientIp,
  hashRateLimitIdentifier,
} from "./analysis-rate-limit";

describe("analysis rate limiting", () => {
  it("prefers a valid Cloudflare address and ignores malformed addresses", () => {
    expect(
      getClientIp(
        new Headers({
          "cf-connecting-ip": "203.0.113.10",
          "x-real-ip": "198.51.100.4",
        }),
        "production",
      ),
    ).toBe("203.0.113.10");
    expect(
      getClientIp(new Headers({ "x-forwarded-for": "not-an-ip" }), "production"),
    ).toBeNull();
  });

  it("uses a deterministic HMAC without exposing the address", () => {
    const result = hashRateLimitIdentifier(
      "203.0.113.10",
      "a-private-rate-limit-secret-that-is-long-enough",
    );
    expect(result).toMatch(/^[a-f0-9]{64}$/);
    expect(result).not.toContain("203.0.113.10");
  });

  it("normalizes a valid database response", async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: [{ allowed: false, remaining: 0, retry_after_seconds: 42 }],
      error: null,
    });

    await expect(
      consumeAnalysisRateLimit(
        { rpc },
        { identifierHash: "a".repeat(64), maxRequests: 5, windowSeconds: 3600 },
      ),
    ).resolves.toEqual({
      allowed: false,
      remaining: 0,
      retryAfterSeconds: 42,
    });
  });

  it("fails closed on database errors or malformed responses", async () => {
    await expect(
      consumeAnalysisRateLimit(
        { rpc: vi.fn().mockResolvedValue({ data: null, error: { message: "offline" } }) },
        { identifierHash: "a".repeat(64), maxRequests: 5, windowSeconds: 3600 },
      ),
    ).rejects.toBeInstanceOf(AnalysisRateLimitUnavailableError);
  });
});
