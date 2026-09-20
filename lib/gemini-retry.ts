const RETRYABLE_STATUS_CODES = new Set([408, 429, 500, 502, 503, 504]);
const DEFAULT_GEMINI_MODELS = [
  "gemini-3.8-flash",
  "gemini-3.6-flash",
  "gemini-3.1-flash-lite",
] as const;

type AttemptContext = {
  attempt: number;
};

type RetryOptions = {
  maxAttempts?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  jitterMs?: number;
  sleep?: (delayMs: number) => Promise<void>;
  random?: () => number;
  onRetry?: (details: {
    attempt: number;
    delayMs: number;
    status: number | undefined;
  }) => void;
};

function statusFromError(error: unknown): number | undefined {
  if (typeof error !== "object" || error === null) {
    return undefined;
  }

  const candidate = error as { status?: unknown; code?: unknown };

  if (typeof candidate.status === "number") {
    return candidate.status;
  }

  if (typeof candidate.code === "number") {
    return candidate.code;
  }

  return undefined;
}

export function isRetryableGeminiError(error: unknown): boolean {
  const status = statusFromError(error);
  return status !== undefined && RETRYABLE_STATUS_CODES.has(status);
}

export function getGeminiModelCandidates(primaryModel?: string): string[] {
  const normalizedPrimary = primaryModel?.trim();

  return [normalizedPrimary, ...DEFAULT_GEMINI_MODELS]
    .filter((model): model is string => Boolean(model))
    .filter((model, index, models) => models.indexOf(model) === index)
    .slice(0, 3);
}

export async function withGeminiRetry<T>(
  operation: (context: AttemptContext) => Promise<T>,
  options: RetryOptions = {},
): Promise<T> {
  const maxAttempts = options.maxAttempts ?? 3;
  const baseDelayMs = options.baseDelayMs ?? 1_000;
  const maxDelayMs = options.maxDelayMs ?? 4_000;
  const jitterMs = options.jitterMs ?? 250;
  const sleep =
    options.sleep ??
    ((delayMs: number) =>
      new Promise<void>((resolve) => setTimeout(resolve, delayMs)));
  const random = options.random ?? Math.random;

  if (!Number.isInteger(maxAttempts) || maxAttempts < 1) {
    throw new RangeError("maxAttempts must be a positive integer.");
  }

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      return await operation({ attempt });
    } catch (error) {
      if (attempt === maxAttempts || !isRetryableGeminiError(error)) {
        throw error;
      }

      const exponentialDelay = Math.min(
        baseDelayMs * 2 ** (attempt - 1),
        maxDelayMs,
      );
      const delayMs = Math.round(exponentialDelay + random() * jitterMs);

      options.onRetry?.({
        attempt,
        delayMs,
        status: statusFromError(error),
      });

      await sleep(delayMs);
    }
  }

  throw new Error("Gemini retry loop ended unexpectedly.");
}
