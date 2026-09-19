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
- Upgraded Vitest from a vulnerable release to 4.1.11; `npm audit` then reported zero known vulnerabilities.

## Launch blockers

### Critical

1. **No paid deliverable exists.** Checkout must stay disabled until payment reliably produces or unlocks a full report.
2. **No durable abuse control exists.** `/api/analyze` can spend Gemini quota for anyone who can reach it. Add a deployment-aware rate limiter and bot protection before public release.
3. **No account or recovery model exists.** Anonymous results are held only in the current browser session; a refresh loses the capability to recover them.
4. **The migration is not applied to the live Supabase project.** The revised analysis route depends on `create_contract_analysis`.

### High

1. **PDF parsing is synchronous in the request.** Larger or pathological PDFs can consume memory and execution time. Move analysis into a durable job/queue before meaningful traffic.
2. **There is no file malware scan or OCR path.** Image-only PDFs fail, while crafted PDFs rely solely on the parser's safety.
3. **There is no end-to-end observability.** Add structured request IDs, redacted error reporting, latency metrics, and alerts without logging contract text.
4. **Privacy operations are undefined.** Set retention, deletion, consent, incident-response, and vendor-processing policies before handling real customer contracts at scale.

### Medium

1. Checkout success currently returns to the home page; it does not show a durable order/report status screen.
2. Refund and dispute webhooks are not implemented.
3. Webhook and Checkout routes need Stripe CLI integration tests against test mode.
4. The health endpoint proves the process is alive, not that Supabase, Gemini, and Stripe are ready.

## Intended request flow

1. Browser uploads a PDF and selects an intent.
2. Server validates the request, extracts text, calls Gemini, validates its JSON, then atomically stores contract metadata and the teaser.
3. Server returns the teaser plus a short-lived signed checkout capability when payments are configured.
4. Browser requests Checkout using that capability.
5. Server creates or reuses a Stripe-hosted Checkout Session.
6. Stripe sends a signed webhook after confirmed payment.
7. The database records the Stripe event and paid state atomically and ignores duplicate events.
8. A future worker generates the paid report; the user retrieves it through an authenticated or durable recovery path.

## GitHub finding

At audit time, `legal-review/` was entirely untracked inside the local `tsc-proposal-studio` Git repository. Therefore none of this application was backed up to GitHub. It needs a separate private repository and an intentional initial push.
