# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

People and small-business owners who have a PDF contract in front of them and need to understand what it gives them, costs them, and commits them to before or after signing.

## Product Purpose

Explain My Contract Now provides a plain-language, educational first pass on a contract. It helps a person identify terms that deserve closer attention and understand the practical consequence of those terms without presenting the analysis as legal advice.

## Positioning

The product organizes the analysis around the reader's real decision: what the agreement gives them, what they pay, what signing commits them to, and which clauses deserve a closer look. The analysis changes depending on whether the person is considering signing or has already signed.

## Operating Context

The user uploads a digital, text-based PDF up to 10 MB, acknowledges the educational-analysis boundary, completes browser verification, and chooses either a pre-signing or already-signed analysis. The free result is a contract snapshot and flag preview. A private recovery link provides access to the report.

## Capabilities and Constraints

- PDF only; scanned documents and photos are not currently supported.
- The product provides informational analysis, not legal advice.
- Contract analysis and private report delivery are implemented.
- Stripe checkout remains disabled. Pricing and paid access must not be presented as available.
- Uploaded contract text and secrets must not appear in application logs.
- The existing consent, Turnstile, upload validation, intent selection, and private-link behavior must be preserved.

## Brand Commitments

- Product name: Explain My Contract Now.
- It is a Tami Stewart Consults tool.
- Use the complete official Tami Stewart Consults mark, including CONSULTS.
- Voice should be direct, candid, specific, useful, and calm. It may acknowledge the reader's real “what the heck?” reaction without manufacturing fear.
- Established TSC identity uses indigo, action blue, bright blue, cool light-blue canvases, restrained coral and gold, Fraunces for display, and Montserrat for body text.

## Evidence on Hand

- The repository contains the working upload and analysis flow, validated result schema, security controls, and automated tests.
- No approved testimonials, customer logos, sales results, usage metrics, or demand proof exist in the repository. Future work must not fabricate them.

## Product Principles

1. Show the practical consequence, not merely a legal-language summary.
2. Distinguish pre-signing questions from post-signing clarity.
3. Earn trust with specificity and honest boundaries.
4. Keep the user's contract and report access private by default.
5. Make the first action obvious without pretending the tool replaces a lawyer.

## Accessibility & Inclusion

The web experience must support keyboard navigation, visible focus states, reduced motion, readable contrast, responsive layouts, and clear form labels and errors.
