import { describe, expect, it } from "vitest";

import {
  createReportRecoveryToken,
  hashReportRecoveryToken,
  verifyReportRecoveryToken,
} from "./report-access";

describe("report recovery tokens", () => {
  it("creates a high-entropy URL-safe token and verifies only its hash", () => {
    const token = createReportRecoveryToken();
    const hash = hashReportRecoveryToken(token);

    expect(token).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
    expect(verifyReportRecoveryToken(token, hash)).toBe(true);
    expect(verifyReportRecoveryToken(`${token.slice(0, -1)}x`, hash)).toBe(false);
  });

  it("rejects malformed tokens and hashes", () => {
    expect(verifyReportRecoveryToken("short", "bad-hash")).toBe(false);
  });
});
