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
- Added explicit-render Cloudflare Turnstile gating for analysis, including token reset, server-side Siteverify, action/hostname enforcement, a 10-second timeout, and fail-closed behavior.
- Added an atomic Supabase-backed analysis rate limiter using HMAC-hashed client IPs, bounded configuration, `Retry-After` responses, and fail-closed database error handling.
- Added production startup guards that reject Turnstile test mode, Cloudflare test credentials, and localhost hostname allowlists.
- Added validated request IDs to every API response, browser-visible support IDs, and structured failure logs that deliberately omit error messages, stacks, contract text, recovery tokens, and secrets.
- Added a bounded Gemini per-attempt timeout and browser-request abort propagation while the durable worker architecture remains behind its privacy and deployment gate.
- Split liveness from readiness: `/api/health` reports process life, while `/api/ready` fails closed on unsafe configuration or unavailable Supabase and validates Stripe configuration only when payments are enabled.
- Upgraded Vitest from a vulnerable release to 4.1.11; `npm audit` then reported zero known vulnerabilities.

## Launch blockers

### Critical

1. **Production Turnstile credentials are not configured.** Local development uses Cloudflare's marked test response path. Create a real widget and set a deployment-specific hostname allowlist before deployment; production startup now rejects test configuration.
2. **Migration history still needs CLI reconciliation.** The schemas were applied and verified through the authenticated Supabase SQL editor, but the local migration files are not yet represented in Supabase CLI migration history.

### High

1. **PDF parsing is synchronous in the request.** Larger or pathological PDFs can consume memory and execution time. The durable design is specified in `BACKGROUND-JOBS-DESIGN.md`, but implementation is gated on a worker host and encrypted temporary-payload retention decision.
2. **There is no file malware scan or OCR path.** Image-only PDFs fail, while crafted PDFs rely solely on the parser's safety.
3. **External monitoring is not connected.** Request IDs and redacted structured errors now provide safe correlation, but the application still needs latency metrics, an error-monitoring sink, and actionable alerts before launch.
4. **Privacy operations are undefined.** Set retention, deletion, consent, incident-response, and vendor-processing policies before handling real customer contracts at scale.

### Medium

1. Anonymous recovery depends on possession of a private high-entropy link; there is not yet an optional email/account recovery path if that link is lost.
2. Refund and dispute webhooks are not implemented.
3. Webhook and Checkout routes need Stripe CLI integration tests against test mode.
4. Readiness intentionally does not call Gemini or Stripe because those probes could spend money or create external side effects. Add provider-level monitoring and synthetic tests in the protected preview environment.

## Intended request flow

1. Browser uploads a PDF, selects an intent, accepts the educational-analysis acknowledgment, and completes Turnstile.
2. Server validates Turnstile and the PDF signature, atomically consumes the client's HMAC-keyed rate-limit allowance, then extracts text and calls Gemini.
3. Server validates Gemini's JSON, then atomically stores contract metadata, a non-sensitive preview, the complete report, and a hash of a random recovery key.
4. Server returns the preview, the one-time-visible recovery key, and a short-lived signed checkout capability when payments are configured.
5. Browser requests Checkout using that capability.
6. Server creates or reuses a Stripe-hosted Checkout Session.
7. Stripe sends a signed webhook after confirmed payment.
8. The database records the Stripe event and paid state atomically and ignores duplicate events.
9. The private report route verifies the recovery key and returns the full report only after the database records payment. The browser retries briefly when a successful Stripe redirect arrives before its webhook.

## GitHub finding

At audit time, `legal-review/` was entirely untracked inside the local `tsc-proposal-studio` Git repository. It is now its own Git repository and is backed up to the private `oceanstew-blip/explain-my-contract` GitHub repository.

## Supabase verification

The payment-state migration was applied to the `Legal Review` production database on 2026-09-19. Direct verification returned `true` for all seven checks: payment columns, `analyses.intent NOT NULL`, the intent constraint, webhook-event RLS, both locked-down service-role functions, and both unique Stripe indexes. The rerun Security Advisor reported zero errors and zero warnings. Its one informational note is intentional: `stripe_webhook_events` has RLS enabled with no public policies because only the server-side `service_role` is granted access.

The paid-report recovery migration was also applied on 2026-09-19. Direct verification returned `true` for all seven recovery checks: the recovery hash column, hash constraint, partial unique index, service-role access to the new six-argument transaction function, blocked `anon` and `authenticated` access, and revoked service-role access to the legacy four-argument function.

The durable rate-limit migration was applied on 2026-09-19. Direct verification confirmed that the table exists with RLS enabled, `anon` and `authenticated` cannot read it or execute the function, `service_role` has only the required table and function access, an allowance of two requests produces allow/allow/block results, and the transactional test leaves no row behind.
