type SupabaseRpcClient = {
  rpc: (
    name: string,
    parameters: Record<string, unknown>,
  ) => PromiseLike<{ data: unknown; error: { code?: string } | null }>;
};

export type ReportDeletionResult = "deleted" | "invalid" | "protected";

export class ReportDeletionUnavailableError extends Error {
  constructor(public readonly code?: string) {
    super("Report deletion is unavailable");
    this.name = "ReportDeletionUnavailableError";
  }
}

export async function deleteUnpaidReport(
  supabase: SupabaseRpcClient,
  input: { contractId: string; recoveryTokenHash: string },
): Promise<ReportDeletionResult> {
  const { data, error } = await supabase.rpc("delete_unpaid_contract", {
    p_contract_id: input.contractId,
    p_recovery_token_hash: input.recoveryTokenHash,
  });

  if (
    error ||
    (data !== "deleted" && data !== "invalid" && data !== "protected")
  ) {
    throw new ReportDeletionUnavailableError(error?.code);
  }

  return data;
}
