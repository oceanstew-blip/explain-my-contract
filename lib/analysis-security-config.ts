export const TURNSTILE_ALWAYS_PASS_SITE_KEY = "1x00000000000000000000AA";
export const TURNSTILE_ALWAYS_PASS_SECRET =
  "1x0000000000000000000000000000000AA";

export function assertSafeAnalysisSecurityConfig(config: {
  nodeEnv: string | undefined;
  siteKey: string;
  secret: string;
  testMode: boolean;
  hostnames: string;
}): void {
  if (config.nodeEnv !== "production") return;

  const hostnames = config.hostnames
    .split(",")
    .map((hostname) => hostname.trim().toLowerCase())
    .filter(Boolean);

  if (
    config.testMode ||
    config.siteKey === TURNSTILE_ALWAYS_PASS_SITE_KEY ||
    config.secret === TURNSTILE_ALWAYS_PASS_SECRET ||
    hostnames.includes("localhost") ||
    hostnames.includes("127.0.0.1")
  ) {
    throw new Error("Unsafe Turnstile configuration is forbidden in production.");
  }
}
