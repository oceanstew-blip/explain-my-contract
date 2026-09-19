import { describe, expect, it } from "vitest";

import {
  createContractAccessToken,
  verifyContractAccessToken,
} from "./contract-access-token";

const CONTRACT_ID = "5c4ac1ca-9408-43e7-8836-02cd09958a49";
const SECRET = "a-secure-test-secret-that-is-long-enough";

describe("contract access tokens", () => {
  it("accepts a valid token for the intended contract", () => {
    const token = createContractAccessToken(CONTRACT_ID, SECRET, 100);
    expect(verifyContractAccessToken(token, CONTRACT_ID, SECRET, 101)).toBe(
      true,
    );
  });

  it("rejects tampering, another contract, and expiration", () => {
    const token = createContractAccessToken(CONTRACT_ID, SECRET, 100);
    expect(verifyContractAccessToken(`${token}x`, CONTRACT_ID, SECRET, 101)).toBe(
      false,
    );
    expect(
      verifyContractAccessToken(
        token,
        "33304b7d-0aa6-4840-ab29-ab8b20f988f8",
        SECRET,
        101,
      ),
    ).toBe(false);
    expect(verifyContractAccessToken(token, CONTRACT_ID, SECRET, 3_701)).toBe(
      false,
    );
  });
});
