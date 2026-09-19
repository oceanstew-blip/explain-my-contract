import { z } from "zod";

const siteverifyResponseSchema = z
  .object({
    success: z.boolean(),
    action: z.string().optional(),
    hostname: z.string().optional(),
    metadata: z
      .object({ result_with_testing_key: z.boolean().optional() })
      .optional(),
  })
  .passthrough();

type VerifyTurnstileOptions = {
  token: string;
  secret: string;
  expectedAction: string;
  expectedHostnames: Set<string>;
  remoteIp?: string;
  testMode?: boolean;
  fetchImpl?: typeof fetch;
};

export function parseTurnstileHostnames(value: string): Set<string> {
  return new Set(
    value
      .split(",")
      .map((hostname) => hostname.trim().toLowerCase())
      .filter(Boolean),
  );
}

export async function verifyTurnstileToken({
  token,
  secret,
  expectedAction,
  expectedHostnames,
  remoteIp,
  testMode = false,
  fetchImpl = fetch,
}: VerifyTurnstileOptions): Promise<boolean> {
  if (
    token.length < 1 ||
    token.length > 2_048 ||
    secret.length < 1 ||
    expectedHostnames.size === 0
  ) {
    return false;
  }

  try {
    const response = await fetchImpl(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        signal: AbortSignal.timeout(10_000),
        body: new URLSearchParams({
          secret,
          response: token,
          ...(remoteIp ? { remoteip: remoteIp } : {}),
        }),
      },
    );
    if (!response.ok) return false;

    const parsed = siteverifyResponseSchema.safeParse(await response.json());
    if (!parsed.success) return false;

    if (testMode) {
      return (
        parsed.data.success === true &&
        parsed.data.hostname === "example.com" &&
        parsed.data.metadata?.result_with_testing_key === true
      );
    }

    return (
      parsed.data.success === true &&
      parsed.data.action === expectedAction &&
      typeof parsed.data.hostname === "string" &&
      expectedHostnames.has(parsed.data.hostname.toLowerCase())
    );
  } catch {
    return false;
  }
}
