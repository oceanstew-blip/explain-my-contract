import { createHmac } from "node:crypto";
import { isIP } from "node:net";

type SupabaseRpcClient = {
  rpc: (
    name: string,
    parameters: Record<string, unknown>,
  ) => PromiseLike<{ data: unknown; error: { message?: string } | null }>;
};

export type AnalysisRateLimitResult = {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
};

export class AnalysisRateLimitUnavailableError extends Error {}

export function getClientIp(
  headers: Headers,
  nodeEnv: string | undefined,
): string | null {
  const candidates = [
    headers.get("cf-connecting-ip"),
    headers.get("x-real-ip"),
    headers.get("x-forwarded-for")?.split(",")[0]?.trim(),
  ];

  for (const candidate of candidates) {
    if (candidate && isIP(candidate)) return candidate;
  }

  return nodeEnv === "production" ? null : "127.0.0.1";
}

export function hashRateLimitIdentifier(
  clientIp: string,
  secret: string,
): string {
  return createHmac("sha256", secret).update(clientIp, "utf8").digest("hex");
}

export async function consumeAnalysisRateLimit(
  supabase: SupabaseRpcClient,
  options: {
    identifierHash: string;
    maxRequests: number;
    windowSeconds: number;
  },
): Promise<AnalysisRateLimitResult> {
  const { data, error } = await supabase.rpc("consume_analysis_rate_limit", {
    p_identifier_hash: options.identifierHash,
    p_max_requests: options.maxRequests,
    p_window_seconds: options.windowSeconds,
  });

  const row = Array.isArray(data) ? data[0] : null;
  if (
    error ||
    !row ||
    typeof row.allowed !== "boolean" ||
    !Number.isInteger(row.remaining) ||
    !Number.isInteger(row.retry_after_seconds)
  ) {
    throw new AnalysisRateLimitUnavailableError(
      `Rate limiter unavailable: ${error?.message ?? "invalid database response"}`,
    );
  }

  return {
    allowed: row.allowed,
    remaining: Math.max(0, row.remaining),
    retryAfterSeconds: Math.max(0, row.retry_after_seconds),
  };
}
