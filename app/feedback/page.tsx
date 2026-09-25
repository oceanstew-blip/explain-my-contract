import Link from "next/link";

import { FeedbackForm } from "./feedback-form";

export default function FeedbackPage() {
  return (
    <main className="policy-page">
      <div className="policy-topline" aria-hidden="true">
        <span>YOUR TEST</span><i>→</i><span>YOUR FEEDBACK</span><i>→</i><span>WHAT WE IMPROVE NEXT</span>
      </div>
      <article className="policy-shell">
        <p className="policy-eyebrow">Explain My Contract Now · beta feedback</p>
        <h1>Tell us what<br /><em>actually happened.</em></h1>
        <p className="policy-lede">This form is for product feedback, not contracts or legal questions.</p>
        <FeedbackForm />
        <Link className="policy-return" href="/">Back to Explain My Contract Now <span aria-hidden="true">→</span></Link>
      </article>
    </main>
  );
}
