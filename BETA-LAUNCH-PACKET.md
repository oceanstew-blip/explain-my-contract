# Explain My Contract Now beta launch packet

Status: staged for the next production deploy. The first beta month is free:
do not invite testers until the free-report flow below has been deployed and
verified.

## What testers need to know

Explain My Contract Now is an educational tool, not a law firm or a substitute
for a lawyer. It translates selected contract language into plain English and
can miss context or make mistakes. Testers should verify important points
against the original contract and speak with a qualified attorney when the
decision is important.

For privacy, do not upload a contract that belongs to someone else unless you
are authorized to share it. The original PDF is not retained. Extracted text is
sent to Gemini for analysis and may be sent to OpenAI if Gemini is unavailable.
The resulting report is stored temporarily in Supabase and accessed through a
private link. Anyone with that link can open the report, so it should not be
forwarded. During the free beta, reports are available for 24 hours.

For support, contact `support@explainmycontractnow.com`. Do not email a
contract or a private report link to support. Include the support ID shown in
an error instead.

## Decisions that must be made before this copy is customer-facing

- **Feedback form:** create one owned form and insert its public URL below.
  Do not collect contract files or private report links in the form.

## Tester invitation draft

Subject: You’re invited to test Explain My Contract Now

Hi [First name],

I’m inviting a small group to test Explain My Contract Now: an educational tool
that turns a PDF contract into a plain-English report. It is not legal advice,
and it can miss context, so please use a fictional or non-sensitive contract
for this beta.

Use this link: https://explainmycontractnow.com/

The first beta month is free. There is no checkout and we will not ask for
payment information.

Please do not forward your private report link. If anything breaks, email
support@explainmycontractnow.com with the Support ID shown on screen; please do
not email your contract or report link. After trying it, leave feedback here:
`[FEEDBACK FORM URL TO BE ADDED]`.

Thank you — I’m especially interested in what was clear, what felt confusing,
and whether the report helped you ask better questions.

## Feedback form copy

Title: Explain My Contract Now beta feedback

Description: Do not paste contract text, upload files, or share a private
report link here. This form is for product feedback only.

1. What kind of fictional or non-sensitive contract did you try?
2. Did the upload and analysis flow work? What happened?
3. What part of the report was most useful?
4. What was confusing, missing, or misleading?
5. Did the limits of the tool (educational, not legal advice) feel clear?
6. How likely are you to use this again? (0–10)
7. May we contact you about your feedback? If yes, provide an email address.

## Controlled production proof checklist

- [ ] Reports and support mailbox routes are Active in Cloudflare.
- [ ] `explainmycontractnow.com` is verified in Resend.
- [ ] The production deploy has `FREE_BETA_ENABLED=true` and
  `STRIPE_CHECKOUT_ENABLED=false`.
- [ ] The public beta information page is deployed.
- [ ] Feedback-form URL is published.
- [ ] Explicit approval has been given for one fictional-contract production
  proof.
- [ ] Verify analysis → private-link full report → 24-hour expiry behavior.
- [ ] Confirm that no checkout, payment collection, or report email is offered.

## Paid launch work, after the free beta

Keep Stripe disabled until the paid launch is deliberately scheduled. That
later work includes the restricted-key rotation, public Stripe support email,
receipt/refund-email decision, written refund policy, one controlled
100%-off checkout proof, and webhook retry/email idempotency verification.
