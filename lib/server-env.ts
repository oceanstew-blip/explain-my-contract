import "server-only";

import { z } from "zod";

const nonEmptyString = z.string().trim().min(1);

function readEnvironment<T extends z.ZodRawShape>(shape: T) {
  return z.object(shape).parse(process.env);
}

export function getAnalysisEnvironment() {
  return readEnvironment({
    GEMINI_API_KEY: nonEmptyString,
    GEMINI_MODEL: nonEmptyString.optional(),
    NEXT_PUBLIC_SUPABASE_URL: z.url(),
    SUPABASE_SECRET_KEY: nonEmptyString,
  });
}

export function getCheckoutEnvironment() {
  return readEnvironment({
    APP_BASE_URL: z.url(),
    CHECKOUT_TOKEN_SECRET: nonEmptyString.min(32),
    STRIPE_CHECKOUT_ENABLED: z.literal("true"),
    STRIPE_PRICE_ID: nonEmptyString.startsWith("price_"),
    STRIPE_SECRET_KEY: nonEmptyString.startsWith("sk_"),
    NEXT_PUBLIC_SUPABASE_URL: z.url(),
    SUPABASE_SECRET_KEY: nonEmptyString,
  });
}

export function getReportEnvironment() {
  return readEnvironment({
    NEXT_PUBLIC_SUPABASE_URL: z.url(),
    SUPABASE_SECRET_KEY: nonEmptyString,
  });
}

export function getStripeWebhookEnvironment() {
  return readEnvironment({
    STRIPE_SECRET_KEY: nonEmptyString.startsWith("sk_"),
    STRIPE_WEBHOOK_SECRET: nonEmptyString.startsWith("whsec_"),
    NEXT_PUBLIC_SUPABASE_URL: z.url(),
    SUPABASE_SECRET_KEY: nonEmptyString,
  });
}
