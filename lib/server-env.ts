import "server-only";

import { z } from "zod";

import { assertSafeAnalysisSecurityConfig } from "./analysis-security-config";

const nonEmptyString = z.string().trim().min(1);

function readEnvironment<T extends z.ZodRawShape>(shape: T) {
  return z.object(shape).parse(process.env);
}

export function getAnalysisEnvironment() {
  const environment = readEnvironment({
    ANALYSIS_RATE_LIMIT_MAX: z.coerce.number().int().min(1).max(1000),
    ANALYSIS_RATE_LIMIT_WINDOW_SECONDS: z.coerce
      .number()
      .int()
      .min(1)
      .max(86400),
    GEMINI_API_KEY: nonEmptyString,
    GEMINI_MODEL: nonEmptyString.optional(),
    GEMINI_REQUEST_TIMEOUT_MS: z.coerce
      .number()
      .int()
      .min(1_000)
      .max(120_000)
      .default(45_000),
    OPENAI_API_KEY: nonEmptyString.optional(),
    OPENAI_MODEL: nonEmptyString.default("gpt-5-mini"),
    OPENAI_REQUEST_TIMEOUT_MS: z.coerce
      .number()
      .int()
      .min(1_000)
      .max(180_000)
      .default(90_000),
    NEXT_PUBLIC_TURNSTILE_SITE_KEY: nonEmptyString,
    NEXT_PUBLIC_SUPABASE_URL: z.url(),
    RATE_LIMIT_HMAC_SECRET: nonEmptyString.min(32),
    SUPABASE_SECRET_KEY: nonEmptyString,
    TURNSTILE_HOSTNAMES: nonEmptyString,
    TURNSTILE_SECRET: nonEmptyString,
    TURNSTILE_TEST_MODE: z.enum(["true", "false"]).default("false"),
  });

  assertSafeAnalysisSecurityConfig({
    nodeEnv: process.env.NODE_ENV,
    deployContext: process.env.DEPLOY_CONTEXT ?? process.env.CONTEXT,
    siteKey: environment.NEXT_PUBLIC_TURNSTILE_SITE_KEY,
    secret: environment.TURNSTILE_SECRET,
    testMode: environment.TURNSTILE_TEST_MODE === "true",
    hostnames: environment.TURNSTILE_HOSTNAMES,
  });

  return environment;
}

export function getCheckoutEnvironment() {
  return readEnvironment({
    APP_BASE_URL: z.url(),
    CHECKOUT_TOKEN_SECRET: nonEmptyString.min(32),
    STRIPE_CHECKOUT_ENABLED: z.literal("true"),
    STRIPE_PRICE_ID_SHORT: nonEmptyString.startsWith("price_"),
    STRIPE_PRICE_ID_STANDARD: nonEmptyString.startsWith("price_"),
    STRIPE_SECRET_KEY: nonEmptyString.regex(/^(sk|rk)_/),
    NEXT_PUBLIC_SUPABASE_URL: z.url(),
    SUPABASE_SECRET_KEY: nonEmptyString,
  });
}

export function getReportEnvironment() {
  return readEnvironment({
    NEXT_PUBLIC_SUPABASE_URL: z.url(),
    REPORT_LINK_TOKEN_SECRET: nonEmptyString.min(32).optional(),
    SUPABASE_SECRET_KEY: nonEmptyString,
  });
}

export function getStripeWebhookEnvironment() {
  return readEnvironment({
    STRIPE_SECRET_KEY: nonEmptyString.regex(/^(sk|rk)_/),
    STRIPE_WEBHOOK_SECRET: nonEmptyString.startsWith("whsec_"),
    NEXT_PUBLIC_SUPABASE_URL: z.url(),
    SUPABASE_SECRET_KEY: nonEmptyString,
  });
}

export function getReportEmailEnvironment() {
  if (process.env.REPORT_EMAIL_ENABLED !== "true") return null;

  return readEnvironment({
    REPORT_EMAIL_ENABLED: z.literal("true"),
    RESEND_API_KEY: nonEmptyString.startsWith("re_"),
    REPORT_EMAIL_FROM: nonEmptyString,
    REPORT_EMAIL_REPLY_TO: z.email(),
    REPORT_LINK_TOKEN_SECRET: nonEmptyString.min(32),
    APP_BASE_URL: z.url(),
  });
}
