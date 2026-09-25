import Link from "next/link";

export default function PrivacyAndSupportPage() {
  return (
    <main className="policy-page">
      <div className="policy-topline" aria-hidden="true">
        <span>YOUR DOCUMENT</span><i>→</i><span>YOUR PRIVATE LINK</span><i>→</i><span>YOUR QUESTIONS</span>
      </div>
      <article className="policy-shell">
        <p className="policy-eyebrow">Explain My Contract Now · beta information</p>
        <h1>Before you upload,<br /><em>know the boundaries.</em></h1>
        <p className="policy-lede">Clear information about your contract, your report, beta checkout, and how to get help.</p>

        <section>
          <h2>What this service is</h2>
          <p>Explain My Contract Now is an educational tool that translates contract language into plainer English. It is not legal advice, does not determine your rights, and cannot tell you whether you should sign or how a term will be enforced.</p>
          <p>AI-generated analysis can miss context or misunderstand language. Verify important points against the original contract and consult a qualified attorney when a decision matters.</p>
        </section>

        <section>
          <h2>How your information is handled</h2>
          <p><strong>The original PDF is not retained.</strong> Text extracted from it is sent to Google Gemini for analysis. If Gemini is unavailable, it may be sent to OpenAI as a backup. The resulting report is temporarily stored in Supabase.</p>
          <p>Only upload a contract you are authorized to share. Do not email contracts, report links, or extracted text to support.</p>
        </section>

        <section>
          <h2>Report links and retention</h2>
          <p>Your report is accessed through a private link. Anyone with that link can open the report, so do not forward it.</p>
          <p>Reports that have not completed checkout expire after 24 hours. Paid reports are retained for at least 30 days after confirmed payment. Payment, refund, and dispute records may be retained longer for accounting and operational requirements.</p>
        </section>

        <section>
          <h2>Free beta checkout</h2>
          <p>The first month of beta access is free for invited testers using a 100%-off promo code. Checkout requires your name and email address, creates no charge when the displayed total is $0, and does not collect a phone number.</p>
          <p>Before completing checkout, confirm that the code is applied and the total is $0. The beta may change or close as we learn from testing. If you have trouble opening a report, contact support with the Support ID shown in the product, not your contract or private report link.</p>
        </section>

        <section>
          <h2>Support and feedback</h2>
          <p>Email <a href="mailto:support@explainmycontractnow.com">support@explainmycontractnow.com</a> for product help. To help us troubleshoot, include the Support ID from the error message and a short description of what happened.</p>
        </section>

        <Link className="policy-return" href="/">Back to Explain My Contract Now <span aria-hidden="true">→</span></Link>
      </article>
    </main>
  );
}
