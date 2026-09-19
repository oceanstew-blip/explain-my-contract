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
- environment template, health route, security headers, and GitHub Actions CI
- passing tests, ESLint, TypeScript, production build, and production dependency audit

Not yet completed:

- paid full-report generation and delivery
- Stripe test-mode Product, Price, secrets, and webhook registration
- applying and verifying the new migration in Supabase
- anonymous-upload ownership claim mechanism
- durable rate limiting and bot protection
- account/recovery flow
- background job processing
- privacy retention and deletion workflow
- monitoring and alerting
- separate private GitHub repository
- deployment
- Stripe test-mode end-to-end tests

## Next implementation sequence

Detailed instructions: [`IMPLEMENTATION-GUIDE.md`](./IMPLEMENTATION-GUIDE.md)

1. Put this folder in its own private GitHub repository.
2. Review and apply the included Supabase migration, then verify functions, constraints, grants, and RLS.
3. Design and implement the paid full report before enabling Checkout.
4. Add durable rate limiting, bot protection, account recovery, and background jobs.
5. Configure Stripe test mode and exercise successful, duplicate, delayed, failed, and tampered webhook cases.
6. Add privacy, retention, deletion, monitoring, refund, and support operations.
7. Deploy a non-production preview and complete security and end-to-end verification before launch.

## Current external-action boundary

Nothing is deployed. Stripe resources were not created, payment remains disabled, the new migration was not applied to Supabase, and no GitHub repository was created or pushed in this pass. Those external changes remain behind explicit approval.
