# Durable Analysis Jobs: Privacy and Deployment Gate

## Decision

Do not move PDF parsing or Gemini analysis into a queue until the application has both a defined encrypted payload-retention rule and a deployed worker runtime. A database queue without a consumer is not a background-processing system, and persisting raw contracts merely to make the request asynchronous would weaken the current privacy boundary.

The current request path therefore remains synchronous for now. Gemini calls have a bounded per-attempt timeout and inherit the browser request's abort signal so abandoned requests do not run without a client-side cancellation signal.

## Required production architecture

1. The upload route performs content type, size, PDF signature, Turnstile, disclaimer, and rate-limit checks.
2. The server creates a random job-access token and stores only its SHA-256 hash.
3. Contract payload bytes are encrypted before durable storage with a dedicated job-encryption key that is not stored in Supabase.
4. A durable Supabase Queue message contains only a job ID, never PDF bytes, extracted text, recovery tokens, or contract content.
5. A scheduled worker reads with a visibility timeout, claims one message, decrypts the payload in memory, parses the PDF, calls Gemini, validates the result, and uses the existing atomic contract-and-analysis function.
6. On success, the worker deletes the encrypted payload and queue message before marking the job complete.
7. On a retryable failure, the message becomes visible again with a bounded attempt count and backoff.
8. On a terminal failure, the encrypted payload is deleted and the job records only a redacted error code.
9. The browser polls a private job-status route using the job ID and access token. Completion returns the existing contract ID, report-recovery token, preview, and optional signed Checkout capability.
10. A cleanup job removes expired queued, failed, and completed job metadata under an approved retention schedule.

## Security requirements

- Use a logged/durable queue, not an unlogged queue.
- Keep queue tables and functions unavailable to `anon` and `authenticated`; only server and worker identities may send, read, archive, or delete messages.
- Use a visibility timeout longer than one processing attempt and make completion idempotent.
- Never place contract content or secrets in queue messages, URLs, logs, metrics, or error-monitoring payloads.
- Keep the encryption key separate from Supabase credentials and support key rotation with a version identifier.
- Authenticate worker invocation independently from browser and Stripe credentials.
- Cap PDF size, extracted characters, Gemini attempts, total job age, and maximum worker execution time.
- Delete encrypted payloads on every success and terminal-failure path; verify cleanup with tests and monitoring.

## Decisions required before implementation

1. **Worker host:** Supabase Edge Function plus Supabase Cron, or the selected application host's durable worker/cron runtime.
2. **Temporary payload retention:** proposed maximum is 24 hours for queued/retryable jobs and immediate deletion after success or terminal failure.
3. **Completed job metadata retention:** proposed maximum is 30 days, separate from paid-report and payment-record retention.
4. **Encryption-key custody:** choose the production secret manager and rotation procedure.
5. **Retry policy:** proposed maximum is three processing attempts with a terminal redacted error code.

## Activation gate

Do not change the browser to the queued flow until the worker, scheduler, encrypted payload storage, polling route, cleanup job, permission checks, retry tests, and failure-recovery tests are all operational in a non-production environment. The existing synchronous route remains the fallback until that end-to-end gate passes.

## Platform references

- [Supabase Queues](https://supabase.com/docs/guides/queues)
- [Consuming queue messages with Edge Functions](https://supabase.com/docs/guides/queues/consuming-messages-with-edge-functions)
- [Supabase Cron](https://supabase.com/docs/guides/cron)
