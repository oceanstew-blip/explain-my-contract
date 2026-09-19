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
- environment template, health route, security headers, and GitHub Actions CI
- passing tests, ESLint, TypeScript, production build, and production dependency audit

Not yet completed:

- Stripe test-mode Product, Price, secrets, and webhook registration
- reconciling the SQL-editor-applied migration with Supabase CLI migration history
- anonymous-upload ownership claim mechanism
- durable rate limiting and bot protection
- account/recovery flow
- background job processing
- privacy retention and deletion workflow
- monitoring and alerting
- deployment
- Stripe test-mode end-to-end tests

## Next implementation sequence

Detailed instructions: [`IMPLEMENTATION-GUIDE.md`](./IMPLEMENTATION-GUIDE.md)

1. Add durable rate limiting and bot protection before exposing the Gemini-backed endpoint.
2. Add optional account-based recovery and background jobs.
3. Configure Stripe test mode and exercise successful, duplicate, delayed, failed, and tampered webhook cases.
4. Add privacy, retention, deletion, monitoring, refund, and support operations.
5. Deploy a non-production preview and complete security and end-to-end verification before launch.

## Pricing proposal under review

The supplied business note proposes one-time pricing by page count: $5 for 1–5 pages, $12 for 6–15 pages, $25 for 16–50 pages, and $50 for 51+ pages. This is not yet approved production pricing. Current Checkout intentionally uses one server-controlled Stripe Price ID; it must not accept a browser-supplied page count or amount.

Before implementing tiers, verify current Stripe and Gemini costs, define what happens when page count and extracted-text volume diverge, and decide whether documents above 50 pages are supported. Create separate server-controlled Stripe Price IDs for approved tiers rather than calculating an arbitrary client-controlled charge.

## Retention decision still required

The current request path parses the uploaded PDF in memory and does not intentionally store the PDF bytes. Supabase stores contract metadata, the free preview, and the full analysis. A 30-day deletion rule is a useful proposal, but it cannot be implemented responsibly until the product defines separate retention periods for unpaid previews, paid reports, payment/refund records, webhook idempotency records, and user-requested deletion. The recovery experience must state the selected expiry before automatic deletion is enabled.

## Current external-action boundary

The earlier payment schema and the paid-report recovery schema were applied and verified in Supabase. The recovery verification returned `true` for the recovery column, hash constraint, unique index, new service-role function permission, blocked public roles, and disabled legacy service-role signature. Nothing is deployed, Stripe resources were not created, and payment remains disabled. Production deployment and Stripe activation remain behind explicit approval.
