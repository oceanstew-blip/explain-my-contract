import { describe, expect, it, vi } from "vitest";

import { assertDatabaseReady, DatabaseReadinessError } from "./readiness";

function readinessClient(result: { error: { code?: string } | null }) {
  const abortSignal = vi.fn().mockResolvedValue(result);
  const limit = vi.fn().mockReturnValue({ abortSignal });
  const select = vi.fn().mockReturnValue({ limit });
  const from = vi.fn().mockReturnValue({ select });

  return { client: { from }, from, select, limit, abortSignal };
}

describe("database readiness", () => {
  it("performs a bounded metadata-only database query", async () => {
    const testClient = readinessClient({ error: null });

    await expect(assertDatabaseReady(testClient.client)).resolves.toBeUndefined();
    expect(testClient.from).toHaveBeenCalledWith("contracts");
    expect(testClient.select).toHaveBeenCalledWith("id", { head: true });
    expect(testClient.limit).toHaveBeenCalledWith(1);
    expect(testClient.abortSignal).toHaveBeenCalledWith(
      expect.any(AbortSignal),
    );
  });

  it("fails closed without exposing the database error message", async () => {
    const testClient = readinessClient({ error: { code: "PGRST000" } });

    const promise = assertDatabaseReady(testClient.client);
    await expect(promise).rejects.toBeInstanceOf(DatabaseReadinessError);
    await expect(promise).rejects.not.toThrow(/database unavailable/i);
  });
});
