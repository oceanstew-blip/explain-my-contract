# Backend production-readiness audit

Audit date: 2026-09-19

## Fixed in this pass

- Replaced the two-step contract/analysis save and best-effort cleanup with one PostgreSQL transaction function.
- Added runtime validation for server configuration.
- Added a server-only Supabase client boundary.
- Added Stripe-hosted Checkout creation with server-controlled Price IDs.
- Added one-hour, HMAC-signed contract capability tokens so a guessed contract ID cannot start checkout.
- Added Stripe idempotency keys, checkout-session reuse, and optimistic checkout versioning.
- Added raw-body Stripe webhook signature verification.
- Added an atomic, duplicate-safe database function for recording paid Checkout events.
- Added explicit payment states and unique Stripe identifiers.
- Added secure response headers, a health endpoint, an environment template, Node 22 requirement, and GitHub Actions verification.
- Added a digital-PDF limitation notice and required educational-analysis acknowledgment enforced in both the browser and `/api/analyze`.
- Upgraded Vitest from a vulnerable release to 4.1.11; `npm audit` then reported zero known vulnerabilities.

## Launch blockers

### Critical

1. **No durable abuse control exists.** `/api/analyze` can spend Gemini quota for anyone who can reach it. Add a deployment-aware rate limiter and bot protection before public release.
2. **Migration history still needs CLI reconciliation.** Both schemas were applied and verified through the authenticated Supabase SQL editor, but the local migration files are not yet represented in Supabase CLI migration history.

### High

1. **PDF parsing is synchronous in the request.** Larger or pathological PDFs can consume memory and execution time. Move analysis into a durable job/queue before meaningful traffic.
2. **There is no file malware scan or OCR path.** Image-only PDFs fail, while crafted PDFs rely solely on the parser's safety.
3. **There is no end-to-end observability.** Add structured request IDs, redacted error reporting, latency metrics, and alerts without logging contract text.
4. **Privacy operations are undefined.** Set retention, deletion, consent, incident-response, and vendor-processing policies before handling real customer contracts at scale.

### Medium

1. Anonymous recovery depends on possession of a private high-entropy link; there is not yet an optional email/account recovery path if that link is lost.
2. Refund and dispute webhooks are not implemented.
3. Webhook and Checkout routes need Stripe CLI integration tests against test mode.
4. The health endpoint proves the process is alive, not that Supabase, Gemini, and Stripe are ready.

## Intended request flow

1. Browser uploads a PDF and selects an intent.
2. Server validates the request, extracts text, calls Gemini, validates its JSON, then atomically stores contract metadata, a non-sensitive preview, the complete report, and a hash of a random recovery key.
3. Server returns the preview, the one-time-visible recovery key, and a short-lived signed checkout capability when payments are configured.
4. Browser requests Checkout using that capability.
5. Server creates or reuses a Stripe-hosted Checkout Session.
6. Stripe sends a signed webhook after confirmed payment.
7. The database records the Stripe event and paid state atomically and ignores duplicate events.
8. The private report route verifies the recovery key and returns the full report only after the database records payment. The browser retries briefly when a successful Stripe redirect arrives before its webhook.

## GitHub finding

At audit time, `legal-review/` was entirely untracked inside the local `tsc-proposal-studio` Git repository. It is now its own Git repository and is backed up to the private `oceanstew-blip/explain-my-contract` GitHub repository.

## Supabase verification

The payment-state migration was applied to the `Legal Review` production database on 2026-09-19. Direct verification returned `true` for all seven checks: payment columns, `analyses.intent NOT NULL`, the intent constraint, webhook-event RLS, both locked-down service-role functions, and both unique Stripe indexes. The rerun Security Advisor reported zero errors and zero warnings. Its one informational note is intentional: `stripe_webhook_events` has RLS enabled with no public policies because only the server-side `service_role` is granted access.

The paid-report recovery migration was also applied on 2026-09-19. Direct verification returned `true` for all seven recovery checks: the recovery hash column, hash constraint, partial unique index, service-role access to the new six-argument transaction function, blocked `anon` and `authenticated` access, and revoked service-role access to the legacy four-argument function.
