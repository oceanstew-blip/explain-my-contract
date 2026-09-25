# Explain My Contract Now beta launch packet

Status: staged for the next production deploy. Do not invite testers or run the
production checkout proof until every checkbox below is complete.

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
forwarded. The product's current defaults are 24 hours for unpaid reports and
at least 30 days after payment for paid reports; financial records have a
longer retention period.

For support, contact `support@explainmycontractnow.com`. Do not email a
contract or a private report link to support. Include the support ID shown in
an error instead.

## Decisions that must be made before this copy is customer-facing

- **Refund policy:** choose the exact eligibility, time limit, and request
  process. The site must not imply a refund promise until this is approved.
- **Feedback form:** create one owned form and insert its public URL below.
  Do not collect contract files or private report links in the form.
- **Beta promotion code:** create a unique 100%-off, live-mode promotion code
  only after the restricted key has been rotated and the product test is
  scheduled.

## Tester invitation draft

Subject: You’re invited to test Explain My Contract Now

Hi [First name],

I’m inviting a small group to test Explain My Contract Now: an educational tool
that turns a PDF contract into a plain-English report. It is not legal advice,
and it can miss context, so please use a fictional or non-sensitive contract
for this beta.

Use this link: https://explainmycontractnow.com/

At checkout, enter this beta code: `[CODE TO BE ADDED]`.

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
- [ ] Netlify has the new sender and reply-to values, then has redeployed.
- [ ] Stripe public customer support email is `support@explainmycontractnow.com`.
- [ ] Production restricted key has been rotated to the minimum required scope;
  its replacement has been set in Netlify.
- [ ] A choice about Stripe customer receipts and refund emails is recorded.
- [ ] Refund policy and feedback-form URL are approved and published.
- [ ] Explicit approval has been given for one fictional contract and a
  100%-off production Checkout.
- [ ] Verify signed webhook, report unlock, exactly one report email, and safe
  behavior when the webhook is replayed.
