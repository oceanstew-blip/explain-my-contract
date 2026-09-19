import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

const RECOVERY_TOKEN_BYTES = 32;

export function createReportRecoveryToken(): string {
  return randomBytes(RECOVERY_TOKEN_BYTES).toString("base64url");
}

export function hashReportRecoveryToken(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

export function verifyReportRecoveryToken(
  token: string,
  expectedHash: string,
): boolean {
  if (!/^[A-Za-z0-9_-]{43}$/.test(token) || !/^[a-f0-9]{64}$/.test(expectedHash)) {
    return false;
  }

  const actual = Buffer.from(hashReportRecoveryToken(token), "hex");
  const expected = Buffer.from(expectedHash, "hex");
  return timingSafeEqual(actual, expected);
}
