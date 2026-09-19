type ReadinessQueryResult = {
  error: { code?: string } | null;
};

type ReadinessClient = {
  from: (table: string) => {
    select: (
      columns: string,
      options: { head: true },
    ) => {
      limit: (count: number) => {
        abortSignal: (
          signal: AbortSignal,
        ) => PromiseLike<ReadinessQueryResult>;
      };
    };
  };
};

export class DatabaseReadinessError extends Error {
  constructor(public readonly code?: string) {
    super("Database readiness check failed");
    this.name = "DatabaseReadinessError";
  }
}

export async function assertDatabaseReady(
  client: ReadinessClient,
  timeoutMs = 3_000,
): Promise<void> {
  const { error } = await client
    .from("contracts")
    .select("id", { head: true })
    .limit(1)
    .abortSignal(AbortSignal.timeout(timeoutMs));

  if (error) throw new DatabaseReadinessError(error.code);
}
