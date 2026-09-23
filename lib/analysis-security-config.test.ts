import { describe, expect, it } from "vitest";

import {
  assertSafeAnalysisSecurityConfig,
  TURNSTILE_ALWAYS_PASS_SECRET,
  TURNSTILE_ALWAYS_PASS_SITE_KEY,
} from "./analysis-security-config";

const safeProductionConfig = {
  nodeEnv: "production",
  siteKey: "real-site-key",
  secret: "real-secret",
  testMode: false,
  hostnames: "contracts.example.com",
};

describe("analysis security configuration", () => {
  it("accepts a production-only configuration", () => {
    expect(() => assertSafeAnalysisSecurityConfig(safeProductionConfig)).not.toThrow();
  });

  it.each([
    { testMode: true },
    { siteKey: TURNSTILE_ALWAYS_PASS_SITE_KEY },
    { secret: TURNSTILE_ALWAYS_PASS_SECRET },
    { hostnames: "contracts.example.com,localhost" },
    { hostnames: "127.0.0.1" },
  ])("rejects unsafe production overrides", (override) => {
    expect(() =>
      assertSafeAnalysisSecurityConfig({ ...safeProductionConfig, ...override }),
    ).toThrow(/forbidden in production/);
  });

  it("allows Cloudflare test configuration outside production", () => {
    expect(() =>
      assertSafeAnalysisSecurityConfig({
        nodeEnv: "development",
        siteKey: TURNSTILE_ALWAYS_PASS_SITE_KEY,
        secret: TURNSTILE_ALWAYS_PASS_SECRET,
        testMode: true,
        hostnames: "localhost,127.0.0.1",
      }),
    ).not.toThrow();
  });

  it("allows Cloudflare test configuration only in a Netlify deploy preview", () => {
    expect(() =>
      assertSafeAnalysisSecurityConfig({
        nodeEnv: "production",
        deployContext: "deploy-preview",
        siteKey: TURNSTILE_ALWAYS_PASS_SITE_KEY,
        secret: TURNSTILE_ALWAYS_PASS_SECRET,
        testMode: true,
        hostnames: "deploy-preview-2--contracts.example.com",
      }),
    ).not.toThrow();

    expect(() =>
      assertSafeAnalysisSecurityConfig({
        nodeEnv: "production",
        deployContext: "production",
        siteKey: TURNSTILE_ALWAYS_PASS_SITE_KEY,
        secret: TURNSTILE_ALWAYS_PASS_SECRET,
        testMode: true,
        hostnames: "contracts.example.com",
      }),
    ).toThrow(/forbidden in production/);
  });
});
