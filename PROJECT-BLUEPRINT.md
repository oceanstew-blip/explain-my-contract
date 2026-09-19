# Explain My Contract Project Blueprint

## Product purpose

Help a user understand a contract in plain language before or after signing it. The product provides informational contract analysis and does not provide legal advice.

## User intent

After a user uploads a PDF and before analysis begins, the UI must ask:

> Are you thinking about signing this, or did you already sign it?

The user must choose one of two explicit options:

- `Thinking About Signing`
- `Already Signed`

The selected intent must be sent with the analysis request, validated by the API, and stored with the contract or analysis record so the result remains interpretable later.

### Thinking About Signing

Use the pre-signing analysis prompt. Focus on explaining the agreement and identifying provisions, risks, negotiation traps, and questions the user may want to raise before signing.

### Already Signed

Use a distinct post-signing analysis prompt. Do not frame the result as a negotiation-trap review. Scan for and explain:

- termination clauses;
- exit strategies available under the contract;
- cure periods and notice requirements;
- liability caps and related limitations; and
- legal jargon translated into plain language.

The post-signing result must explicitly state that it provides informational text and does not provide legal advice on how to litigate. It must not recommend litigation strategy or present itself as a substitute for a qualified attorney.

## Current implementation status

Completed:

- Supabase tables: `users`, `contracts`, and `analyses`
- Row Level Security and verified ownership policies
- Next.js 16.3.5 application
- Turbopack project-root configuration
- Required Supabase, Gemini, PDF parsing, and validation dependencies
- Local environment configuration, ignored by Git
- `/api/analyze` endpoint with strict PDF and Gemini output validation
- atomic contract and analysis persistence migration
- bounded Gemini retry and model fallback
- branded pre-signing and already-signed result UI
- server-only Stripe Checkout and signature-verified webhook routes
- duplicate-safe Stripe payment recording migration
- a real free/paid content boundary: the browser receives a snapshot and flag labels, while clause translations, consequences, and next steps remain server-side
- a 256-bit anonymous recovery key stored only as a SHA-256 hash, with a private `/report/[contractId]` recovery experience
- paid report retrieval that checks both the recovery key and recorded payment state before returning the full analysis
- payment return handling that preserves the recovery key in session storage and briefly polls for delayed webhooks
- upload copy that clearly excludes scanned/image-only PDFs
- browser and server enforcement of an explicit educational-analysis acknowledgment
- Cloudflare Turnstile browser verification and fail-closed server-side Siteverify checks on `/api/analyze`
- durable, Supabase-backed analysis rate limiting keyed by an HMAC of the client IP, with atomic counters and fail-closed behavior
- production configuration guards that reject Turnstile test keys, test mode, and localhost hostname allowlists
- request correlation IDs on every API response, support IDs in browser-visible errors, and structured server failures that omit error messages, stacks, contract text, and secrets
- separate liveness and fail-closed readiness endpoints; readiness validates production-safe configuration, payment configuration when enabled, and bounded Supabase connectivity without contacting Gemini or Stripe
- recovery-token-authorized permanent deletion for unpaid, non-Stripe-linked reports, with paid and payment-linked records held for a separate support-assisted process
- reconciled Supabase CLI migration history for every verified production migration
- a checked-in baseline for the original manually created schema, allowing the
  complete migration chain to replay from an empty local Supabase database
- fail-closed stored-report validation before delivery, including checkout-capability suppression for disabled, paid, refunded, or unknown payment states
- duplicate-safe failed-payment, expiration, refund, partial-refund audit, and dispute transitions with server-side checkout lockout for ineligible states
- environment template, health route, security headers, and GitHub Actions CI
- passing tests, ESLint, TypeScript, production build, and production dependency audit

Not yet completed:

- Stripe test-mode Product, Price, secrets, and webhook registration
- production Turnstile widget/sitekey/secret and deployment-specific hostname allowlist
- anonymous-upload ownership claim mechanism
- account/recovery flow
- background job processing
- preview-environment verification of the automatic retention schedule and its
  operational alerts
- external error monitoring, metrics, and alerting
- deployment
- Stripe test-mode end-to-end tests

## Next implementation sequence

Detailed instructions: [`IMPLEMENTATION-GUIDE.md`](./IMPLEMENTATION-GUIDE.md)

1. Replace the local Turnstile test keys with a production widget and deployment-specific hostname allowlist before exposing the Gemini-backed endpoint.
2. Approve the worker host and encrypted temporary-payload retention decisions in [`BACKGROUND-JOBS-DESIGN.md`](./BACKGROUND-JOBS-DESIGN.md), then build and verify the complete queued workflow before switching the browser to it.
3. Configure Stripe test mode and exercise successful, duplicate, delayed, failed, and tampered webhook cases.
4. Verify privacy and retention behavior in preview, then add monitoring and
   documented incident/refund/support operations.
5. Deploy a non-production preview and complete security and end-to-end verification before launch.

## Pricing proposal under review

The supplied business note proposes one-time pricing by page count: $5 for 1–5 pages, $12 for 6–15 pages, $25 for 16–50 pages, and $50 for 51+ pages. This is not yet approved production pricing. Current Checkout intentionally uses one server-controlled Stripe Price ID; it must not accept a browser-supplied page count or amount.

Before implementing tiers, verify current Stripe and Gemini costs, define what happens when page count and extracted-text volume diverge, and decide whether documents above 50 pages are supported. Create separate server-controlled Stripe Price IDs for approved tiers rather than calculating an arbitrary client-controlled charge.

## Retention policy selected for preview verification

The request path parses the uploaded PDF in memory and does not intentionally
store the PDF bytes. The migration uses these conservative product-policy
defaults, which still require review against the written privacy, accounting,
refund, and dispute procedures before launch:

| Record | Retention | Expiration behavior |
| --- | --- | --- |
| Unpaid analysis and preview | 24 hours | Access and checkout fail closed at the timestamp; the analysis and payment-free contract row are deleted by the daily bounded cleanup. |
| Paid analysis and preview | 30 days after confirmed payment | Payment extends an unexpired report to at least 30 days; expiry removes the analysis, file name, and recovery hash while retaining the minimum financial record. |
| Payment/refund/dispute metadata | 7 years after the latest recorded financial event | Retained separately from report content, then deleted in a bounded batch after expiry. This is an operational default, not a universal legal requirement. |
| Stripe webhook idempotency rows | 400 days | Deleted in bounded batches; the window comfortably exceeds Stripe's ordinary retry period while preserving long-tail payment-event audit protection. |

`expire_due_records(500)` is service-role-only and runs daily at 03:17 UTC via
Supabase Cron. Each run is recorded in `cron.job_run_details`. Preview
verification must cover expiry-boundary access, cleanup counts, job history,
failure alerting, and rollback-safe synthetic records before production use.

## Current external-action boundary

The payment, paid-report recovery, durable rate-limit, unpaid-report deletion, payment-reversal, and payment-index schemas were applied and verified in Supabase, and every local version now matches Supabase CLI migration history. Verification covered invalid-token rejection, atomic unpaid report deletion, paid-record protection, duplicate webhook delivery, failure/refund/dispute ordering, partial-refund audit behavior, service-role-only execution, and clean rollback of all synthetic rows. Nothing is deployed, Stripe resources were not created, and payment remains disabled. Production deployment and Stripe activation remain behind explicit approval.

The original hosted schema predated CLI migration tracking. Migration
`20260919000000_baseline_existing_schema.sql` now reproduces those original
tables, constraints, indexes, RLS policies, and grants locally. Its hosted
history entry was marked applied without executing schema SQL. A clean local
database successfully replayed the baseline and every later migration; only the
retention migration remains pending on the hosted project.
