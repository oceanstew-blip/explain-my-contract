import { describe, expect, it, vi } from "vitest";

import { parseTurnstileHostnames, verifyTurnstileToken } from "./turnstile";

const baseOptions = {
  token: "fresh-browser-token",
  secret: "test-secret",
  expectedAction: "analyze_contract",
  expectedHostnames: new Set(["localhost"]),
};

function response(body: unknown, ok = true) {
  return Promise.resolve({ ok, json: async () => body } as Response);
}

describe("Turnstile verification", () => {
  it("normalizes the configured hostname allowlist", () => {
    expect(parseTurnstileHostnames(" localhost, 127.0.0.1,LOCALHOST ")).toEqual(
      new Set(["localhost", "127.0.0.1"]),
    );
  });

  it("accepts only a successful response with the expected action and hostname", async () => {
    const fetchImpl = vi.fn(() =>
      response({
        success: true,
        action: "analyze_contract",
        hostname: "localhost",
      }),
    );

    await expect(
      verifyTurnstileToken({ ...baseOptions, fetchImpl }),
    ).resolves.toBe(true);
  });

  it("accepts only Cloudflare-marked fixed responses in explicit test mode", async () => {
    const fetchImpl = vi.fn(() =>
      response({
        success: true,
        hostname: "example.com",
        metadata: { result_with_testing_key: true },
      }),
    );

    await expect(
      verifyTurnstileToken({ ...baseOptions, testMode: true, fetchImpl }),
    ).resolves.toBe(true);
    await expect(
      verifyTurnstileToken({
        ...baseOptions,
        testMode: true,
        fetchImpl: vi.fn(() =>
          response({ success: true, hostname: "example.com" }),
        ),
      }),
    ).resolves.toBe(false);
  });

  it.each([
    { success: false, action: "analyze_contract", hostname: "localhost" },
    { success: true, action: "another_action", hostname: "localhost" },
    { success: true, action: "analyze_contract", hostname: "evil.example" },
  ])("rejects an invalid verification result", async (body) => {
    await expect(
      verifyTurnstileToken({
        ...baseOptions,
        fetchImpl: vi.fn(() => response(body)),
      }),
    ).resolves.toBe(false);
  });

  it("fails closed on upstream and malformed responses", async () => {
    await expect(
      verifyTurnstileToken({
        ...baseOptions,
        fetchImpl: vi.fn(() => Promise.reject(new Error("offline"))),
      }),
    ).resolves.toBe(false);
    await expect(
      verifyTurnstileToken({
        ...baseOptions,
        fetchImpl: vi.fn(() => response({ unexpected: true })),
      }),
    ).resolves.toBe(false);
  });
});
