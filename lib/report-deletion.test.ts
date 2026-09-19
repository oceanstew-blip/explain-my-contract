import { describe, expect, it, vi } from "vitest";

import {
  deleteUnpaidReport,
  ReportDeletionUnavailableError,
} from "./report-deletion";

describe("unpaid report deletion", () => {
  it.each(["deleted", "invalid", "protected"] as const)(
    "accepts the database result %s",
    async (result) => {
      const rpc = vi.fn().mockResolvedValue({ data: result, error: null });
      await expect(
        deleteUnpaidReport(
          { rpc },
          { contractId: "contract-id", recoveryTokenHash: "a".repeat(64) },
        ),
      ).resolves.toBe(result);
      expect(rpc).toHaveBeenCalledWith("delete_unpaid_contract", {
        p_contract_id: "contract-id",
        p_recovery_token_hash: "a".repeat(64),
      });
    },
  );

  it("fails closed on database errors and unexpected results", async () => {
    await expect(
      deleteUnpaidReport(
        {
          rpc: vi.fn().mockResolvedValue({
            data: null,
            error: { code: "PGRST000" },
          }),
        },
        { contractId: "contract-id", recoveryTokenHash: "a".repeat(64) },
      ),
    ).rejects.toBeInstanceOf(ReportDeletionUnavailableError);
  });
});
