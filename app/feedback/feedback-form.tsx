"use client";

import { FormEvent, useState } from "react";

const privateLinkPattern = /https?:\/\/|\/report\//i;

export function FeedbackForm() {
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    const freeText = ["most-useful", "confusing-or-missing"]
      .map((field) => String(formData.get(field) ?? ""))
      .join(" ");

    if (privateLinkPattern.test(freeText)) {
      setStatus("error");
      return;
    }

    setStatus("sending");
    try {
      const response = await fetch("/__forms.html", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams(
          Array.from(formData.entries()).map(([key, value]) => [key, String(value)]),
        ).toString(),
      });
      if (!response.ok) throw new Error("Feedback submission failed.");
      form.reset();
      setStatus("sent");
    } catch {
      setStatus("error");
    }
  }

  return (
    <form className="feedback-form" data-netlify="true" method="POST" name="beta-feedback" netlify-honeypot="bot-field" onSubmit={submit}>
      <input name="form-name" type="hidden" value="beta-feedback" />
      <p className="feedback-honeypot"><label>Leave this blank <input name="bot-field" /></label></p>

      <label>
        What kind of fictional or non-sensitive contract did you try?
        <input name="contract-type" required type="text" />
      </label>
      <label>
        Did the upload, analysis, and checkout flow work?
        <select defaultValue="" name="flow-result" required>
          <option disabled value="">Choose one</option>
          <option>Yes, all of it worked</option>
          <option>Partly</option>
          <option>No</option>
        </select>
      </label>
      <label>
        What was most useful?
        <textarea name="most-useful" required rows={4} />
      </label>
      <label>
        What was confusing, missing, or misleading?
        <textarea name="confusing-or-missing" required rows={4} />
      </label>
      <label>
        Were the limits of the tool—educational, not legal advice—clear?
        <select defaultValue="" name="limits-clear" required>
          <option disabled value="">Choose one</option>
          <option>Yes</option>
          <option>Mostly</option>
          <option>No</option>
        </select>
      </label>
      <label>
        How likely are you to use this again? (0–10)
        <input max="10" min="0" name="likelihood" required type="number" />
      </label>
      <label>
        May we contact you about your feedback? If yes, add your email.
        <input name="follow-up-email" type="email" />
      </label>

      <p className="feedback-boundary">Do not paste contract text, upload files, or share a private report link here.</p>
      {status === "error" ? <p className="feedback-error" role="alert">Please remove private links from your feedback, or try again later.</p> : null}
      {status === "sent" ? <p className="feedback-success" role="status">Thank you. Your feedback was received.</p> : null}
      <button disabled={status === "sending"} type="submit">{status === "sending" ? "Sending…" : "Send feedback"}</button>
    </form>
  );
}
