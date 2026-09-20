import { describe, expect, it, vi } from "vitest";

import {
  getGeminiModelCandidates,
  isRetryableGeminiError,
  withGeminiRetry,
} from "./gemini-retry";

describe("Gemini retry handling", () => {
  it("uses three current stable models by default", () => {
    expect(getGeminiModelCandidates()).toEqual([
      "gemini-3.8-flash",
      "gemini-3.6-flash",
      "gemini-3.1-flash-lite",
    ]);
  });

  it("honors a configured primary model without duplicating it", () => {
    expect(getGeminiModelCandidates(" gemini-3.6-flash ")).toEqual([
      "gemini-3.6-flash",
      "gemini-3.8-flash",
      "gemini-3.1-flash-lite",
    ]);
  });

  it.each([408, 429, 500, 502, 503, 504])(
    "recognizes HTTP %i as retryable",
    (status) => {
      expect(isRetryableGeminiError({ status })).toBe(true);
    },
  );

  it.each([400, 401, 403, 404, 422])(
    "does not retry permanent HTTP %i errors",
    (status) => {
      expect(isRetryableGeminiError({ status })).toBe(false);
    },
  );

  it("retries a 503 and returns the later successful result", async () => {
    const operation = vi
      .fn<() => Promise<string>>()
      .mockRejectedValueOnce({ status: 503 })
      .mockResolvedValue("success");
    const sleep = vi.fn<() => Promise<void>>().mockResolvedValue(undefined);
    const onRetry = vi.fn();

    await expect(
      withGeminiRetry(operation, {
        sleep,
        random: () => 0,
        onRetry,
      }),
    ).resolves.toBe("success");

    expect(operation).toHaveBeenCalledTimes(2);
    expect(operation.mock.calls).toEqual([[{ attempt: 1 }], [{ attempt: 2 }]]);
    expect(sleep).toHaveBeenCalledWith(1_000);
    expect(onRetry).toHaveBeenCalledWith({
      attempt: 1,
      delayMs: 1_000,
      status: 503,
    });
  });

  it("uses bounded exponential backoff and stops after two retries", async () => {
    const error = { status: 503 };
    const operation = vi.fn<() => Promise<never>>().mockRejectedValue(error);
    const sleep = vi.fn<() => Promise<void>>().mockResolvedValue(undefined);

    await expect(
      withGeminiRetry(operation, {
        sleep,
        random: () => 0,
      }),
    ).rejects.toBe(error);

    expect(operation).toHaveBeenCalledTimes(3);
    expect(operation.mock.calls).toEqual([
      [{ attempt: 1 }],
      [{ attempt: 2 }],
      [{ attempt: 3 }],
    ]);
    expect(sleep.mock.calls).toEqual([[1_000], [2_000]]);
  });

  it("does not retry permanent errors", async () => {
    const error = { status: 404 };
    const operation = vi.fn<() => Promise<never>>().mockRejectedValue(error);
    const sleep = vi.fn<() => Promise<void>>().mockResolvedValue(undefined);

    await expect(withGeminiRetry(operation, { sleep })).rejects.toBe(error);

    expect(operation).toHaveBeenCalledTimes(1);
    expect(sleep).not.toHaveBeenCalled();
  });
});
