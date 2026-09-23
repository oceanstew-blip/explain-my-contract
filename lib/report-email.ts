import { z } from "zod";

const emailResponseSchema = z.object({ id: z.string().min(1) });

type ReportFinding = {
  headline: string;
  attention_level: "high_attention" | "important" | "document_quality";
  danger: string;
  location: string;
};

export type ReportEmailContent = {
  agreementType: string;
  expiresAt: string;
  findings: ReportFinding[];
};

function escapeHtml(value: string): string {
  return value.replace(/[&<>"]/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
  })[character] ?? character);
}

export function renderReportReadyEmail(content: ReportEmailContent) {
  const priorityFindings = [...content.findings]
    .sort((left, right) => {
      const priority = { high_attention: 0, important: 1, document_quality: 2 };
      return priority[left.attention_level] - priority[right.attention_level];
    })
    .slice(0, 3);
  const expires = new Intl.DateTimeFormat("en-US", {
    dateStyle: "long",
    timeZone: "UTC",
  }).format(new Date(content.expiresAt));

  const textFindings = priorityFindings.length
    ? priorityFindings.map((finding, index) =>
        `${index + 1}. ${finding.headline} (${finding.location})\n${finding.danger}`,
      ).join("\n\n")
    : "The report did not identify a term requiring elevated attention.";
  const htmlFindings = priorityFindings.length
    ? `<ol>${priorityFindings.map((finding) => `<li style="margin-bottom:16px"><strong>${escapeHtml(finding.headline)}</strong> <span style="color:#5d6475">(${escapeHtml(finding.location)})</span><br>${escapeHtml(finding.danger)}</li>`).join("")}</ol>`
    : "<p>The report did not identify a term requiring elevated attention.</p>";

  return {
    subject: `Your Explain My Contract report: ${content.agreementType}`,
    text: [
      "Your contract report is ready.",
      "",
      content.agreementType,
      "",
      "A few items from your report:",
      textFindings,
      "",
      `Your private report is available in the browser where you completed checkout until ${expires}.`,
      "",
      "For privacy, your uploaded contract and complete report are not attached to this email.",
      "This is educational information, not legal advice.",
    ].join("\n"),
    html: `
      <div style="font-family:Arial,sans-serif;color:#171a2b;line-height:1.55;max-width:640px;margin:auto">
        <p style="color:#061d95;font-weight:700;letter-spacing:.08em;text-transform:uppercase">Explain My Contract Now</p>
        <h1 style="color:#061d95;font-family:Georgia,serif">Your contract report is ready.</h1>
        <h2 style="font-size:20px">${escapeHtml(content.agreementType)}</h2>
        <p><strong>A few items from your report:</strong></p>
        ${htmlFindings}
        <p>Your private report is available in the browser where you completed checkout until <strong>${escapeHtml(expires)}</strong>.</p>
        <p style="background:#f1f7ff;padding:16px;border-radius:12px">For privacy, your uploaded contract and complete report are not attached to this email.</p>
        <p style="font-size:13px;color:#5d6475">This is educational information, not legal advice.</p>
      </div>
    `.trim(),
  };
}

export async function sendReportReadyEmail(options: {
  apiKey: string;
  from: string;
  replyTo: string;
  to: string;
  contractId: string;
  content: ReportEmailContent;
  fetchImplementation?: typeof fetch;
}): Promise<string> {
  const message = renderReportReadyEmail(options.content);
  const response = await (options.fetchImplementation ?? fetch)(
    "https://api.resend.com/emails",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${options.apiKey}`,
        "Content-Type": "application/json",
        "Idempotency-Key": `report-ready/${options.contractId}`,
      },
      body: JSON.stringify({
        from: options.from,
        reply_to: options.replyTo,
        to: [options.to],
        subject: message.subject,
        text: message.text,
        html: message.html,
      }),
    },
  );

  if (!response.ok) {
    throw new Error(`Report email provider returned HTTP ${response.status}.`);
  }

  return emailResponseSchema.parse(await response.json()).id;
}
