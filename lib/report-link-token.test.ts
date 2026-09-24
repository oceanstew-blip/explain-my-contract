import { describe, expect, it } from "vitest";

import { createReportLinkToken, verifyReportLinkToken } from "./report-link-token";

const CONTRACT_ID = "5c4ac1ca-9408-43e7-8836-02cd09958a49";
const OTHER_CONTRACT_ID = "33304b7d-0aa6-4840-ab29-ab8b20f988f8";
const SECRET = "a-report-link-secret-that-is-long-enough";

describe("emailed report-link tokens", () => {
  it("accepts an untampered token until the report expiration", () => {
    const token = createReportLinkToken(
      CONTRACT_ID,
      "2030-01-01T00:00:00.000Z",
      SECRET,
    );

    expect(verifyReportLinkToken(token, CONTRACT_ID, SECRET, 1_800_000_000))
      .toBe(true);
  });

  it("rejects another contract, tampering, and expiration", () => {
    const token = createReportLinkToken(
      CONTRACT_ID,
      "2030-01-01T00:00:00.000Z",
      SECRET,
    );

    expect(verifyReportLinkToken(token, OTHER_CONTRACT_ID, SECRET, 1_800_000_000))
      .toBe(false);
    expect(verifyReportLinkToken(`${token}x`, CONTRACT_ID, SECRET, 1_800_000_000))
      .toBe(false);
    expect(verifyReportLinkToken(token, CONTRACT_ID, SECRET, 1_900_000_000))
      .toBe(false);
  });
});
