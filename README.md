# Explain My Contract

An educational Next.js application that translates a PDF contract into plain language before or after signing. It is not legal advice.

## Current state

- PDF validation and text extraction run on the server.
- Gemini returns schema-validated JSON with bounded retry and model fallback.
- Supabase stores contract metadata and analysis atomically after the included migration is applied.
- Turnstile and a durable Supabase-backed rate limiter protect the Gemini-backed analysis endpoint.
- API responses include correlation IDs; user-visible failures show a support ID while server logs omit error messages, stacks, uploaded contract text, and secrets.
- `/api/health` is a liveness check; `/api/ready` validates safe configuration and bounded Supabase connectivity for protected preview and production health probes.
- A private recovery link can permanently delete an unpaid report after explicit confirmation; payment-linked records fail closed for support-assisted handling.
- Stripe Checkout, signed webhooks, paid-report unlocking, failed-payment handling, full refunds, partial-refund audit records, and disputes are implemented behind `STRIPE_CHECKOUT_ENABLED=false`.
- Payment must remain disabled until Stripe test-mode integration, refund/support operations, and the remaining launch gates are complete.
- Nothing in this folder is deployed automatically merely because the code exists locally.

## Local setup

1. Use Node.js 22 or newer.
2. Run `npm ci`.
3. Copy `.env.example` to `.env.local` and enter test credentials.
4. Apply the Supabase migrations to the intended environment.
5. Set a unique 32+ character `RATE_LIMIT_HMAC_SECRET`; never reuse a public key or browser-visible value.
6. Run `npm run dev` and open `http://localhost:3000`.

Never commit `.env.local`, a Stripe secret key, a Stripe webhook secret, a Supabase secret key, or uploaded contracts.

## Verification

```bash
npm run check
```

This runs tests, ESLint, TypeScript, and the production webpack build. GitHub Actions runs the same command on pushes to `main` and on pull requests.

## Stripe activation checklist

The payment code is intentionally unavailable until every item below is complete:

1. Verify the implemented full paid report deliverable in a protected preview.
2. Create a Stripe Product and one-time Price in test mode.
3. Set `STRIPE_PRICE_ID`, `STRIPE_SECRET_KEY`, and a 32+ character `CHECKOUT_TOKEN_SECRET`.
4. Register `/api/stripe/webhook`, subscribe it to the required events below, and set `STRIPE_WEBHOOK_SECRET`.
5. Apply the payment-state migration and verify its functions and RLS/grants.
6. Test successful, duplicate, delayed, failed, and tampered webhook cases in Stripe test mode.
7. Confirm the implemented full-refund, partial-refund, dispute, and customer-support behavior against written policy.
8. Only then set `STRIPE_CHECKOUT_ENABLED=true`.

The browser never decides whether a payment succeeded. Only a signature-verified Stripe webhook can mark a contract paid.

Required webhook events:

- `checkout.session.completed`
- `checkout.session.async_payment_succeeded`
- `checkout.session.async_payment_failed`
- `checkout.session.expired`
- `charge.refunded`
- `charge.dispute.created`
- `charge.dispute.closed`

## Deployment and GitHub

This application should live in its own private GitHub repository, not inside an unrelated repository. A deployment platform can then import that repository and receive secrets through its environment-variable settings. GitHub stores code and history; it does not store the production database, Stripe account, or secret values.

See [BACKEND-AUDIT.md](./BACKEND-AUDIT.md) for the current risk assessment and remaining launch blockers.
