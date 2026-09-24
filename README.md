# Explain My Contract Now

An educational Next.js application that translates a PDF contract into plain language before or after signing. It is not legal advice.

## Current state

- PDF validation and text extraction run on the server.
- Gemini returns schema-validated JSON with bounded retry and model fallback.
- When configured, retryable Gemini outages fail over to OpenAI GPT-5.6 Terra using the same strict report schema. OpenAI requests set `store: false`.
- Supabase stores contract metadata and analysis atomically after the included migration is applied.
- Turnstile and a durable Supabase-backed rate limiter protect the Gemini-backed analysis endpoint.
- API responses include correlation IDs; user-visible failures show a support ID while server logs omit error messages, stacks, uploaded contract text, and secrets.
- `/api/health` is a liveness check; `/api/ready` validates safe configuration and bounded Supabase connectivity for protected preview and production health probes.
- A private recovery link can permanently delete an unpaid report after explicit confirmation; payment-linked records fail closed for support-assisted handling.
- Stripe Checkout, signed webhooks, paid-report unlocking, failed-payment handling, full refunds, partial-refund audit records, and disputes are implemented behind `STRIPE_CHECKOUT_ENABLED=false`.
- Checkout creates branded post-purchase invoices, never requests a phone number, and accepts active promotion codes. A 100%-off promotion leaves email as the only required contact field.
- Optional transactional report-summary email is implemented behind `REPORT_EMAIL_ENABLED=false`. It sends up to three priority findings and an expiring signed report link after a signed paid-checkout webhook, omits the uploaded PDF and full report, and records delivery without storing the recipient address in the application database.
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

## Retention defaults

- Unpaid reports: 24 hours.
- Paid reports: at least 30 days after confirmed payment.
- Payment, refund, and dispute metadata: 7 years after the latest recorded
  financial event.
- Stripe webhook idempotency records: 400 days.

The report endpoint and Checkout fail closed at `report_expires_at`. A daily
Supabase Cron job calls the service-role-only `expire_due_records(500)` function
to remove expired content in bounded batches. These are preview-stage product
defaults, not legal advice; verify them against written privacy and accounting
procedures before launch.

## Transactional email setup

Recommended product addresses for the Tami Stewart Consults domain:

- Sender: `Explain My Contract Now <reports@tamistewartconsults.com>`
- Monitored reply-to: `help@tamistewartconsults.com`

Inbound mail is separate from transactional sending. Confirm that both
addresses route to a monitored inbox, then verify the sending domain with the
transactional provider before setting `REPORT_EMAIL_ENABLED=true`. Configure
`REPORT_LINK_TOKEN_SECRET` as a unique server-only value of at least 32
characters. The emailed report URL carries its signed access token in the URL
fragment so ordinary HTTP requests and link previews do not send that token to
the server; the report client exchanges it through the authenticated API call.

## Verification

```bash
npm run check
supabase db start
supabase test db --local
supabase db advisors --local
```

The database commands replay every migration from the checked-in baseline,
exercise retention and permission behavior with pgTAP, and run the Supabase
security/performance advisors. GitHub Actions runs the same database checks on
every pull request and push to `main`.

This runs tests, ESLint, TypeScript, and the production webpack build. GitHub Actions runs the same command on pushes to `main` and on pull requests.

## Stripe activation checklist

The payment code is intentionally unavailable until every item below is complete:

1. Verify the implemented full paid report deliverable in a protected preview.
2. Create a Stripe Product with one-time Prices for short (1–5 page) and standard (6+ page) contracts in test mode.
3. Create a test-mode Coupon and customer-facing Promotion Code for beta testers. Checkout Sessions accept active promotion codes at the Stripe-hosted checkout page.
4. Set `STRIPE_PRICE_ID_SHORT`, `STRIPE_PRICE_ID_STANDARD`, `STRIPE_SECRET_KEY`, and a 32+ character `CHECKOUT_TOKEN_SECRET`.
5. Register `/api/stripe/webhook`, subscribe it to the required events below, and set `STRIPE_WEBHOOK_SECRET`.
6. Apply the payment-state migration and verify its functions and RLS/grants.
7. Test full-price and 100%-discount checkouts plus successful, duplicate, delayed, failed, and tampered webhook cases in Stripe test mode.
8. Confirm the implemented full-refund, partial-refund, dispute, and customer-support behavior against written policy.
9. Verify the transactional-email sending domain, apply the report-email migration, configure the sender and monitored reply-to address, and test paid and 100%-off delivery plus webhook retries.
10. Only then set `REPORT_EMAIL_ENABLED=true` and `STRIPE_CHECKOUT_ENABLED=true`.

The browser never decides whether a payment succeeded. Only a signature-verified Stripe webhook can mark a contract paid.
Completed 100%-off Checkout Sessions are accepted in Stripe's `paid` or
`no_payment_required` state; an `unpaid` session never unlocks a report.

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
