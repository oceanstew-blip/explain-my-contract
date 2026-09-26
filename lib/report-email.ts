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
  reportUrl: string;
  /** Public image URL; previews may supply a local URL. */
  heroImageUrl?: string;
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
    timeStyle: "short",
    timeZone: "UTC",
  }).format(new Date(content.expiresAt));

  const textFindings = priorityFindings.length
    ? priorityFindings.map((finding, index) =>
        `${index + 1}. ${finding.headline} (${finding.location})\n${finding.danger}`,
      ).join("\n\n")
    : "No flagged findings were returned for this report. This does not guarantee that the contract is risk-free. Review the full report and check the original contract.";
  const heroImageUrl = content.heroImageUrl ?? "https://explainmycontractnow.com/brand/contract-email-hero.jpg";
  const labels = { high_attention: "High attention", important: "Important to understand", document_quality: "Document-quality concern" };
  const htmlFindings = priorityFindings.length
    ? priorityFindings.map((finding, index) => `<tr><td style="padding:0 28px 16px"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border:1px solid #cbd9e9;border-radius:12px;background:#f5f9fd"><tr><td style="padding:20px"><p style="margin:0 0 8px;color:#235d86;font-size:11px;font-weight:bold;letter-spacing:1px;text-transform:uppercase">${index + 1} / ${labels[finding.attention_level]}</p><h3 style="margin:0 0 8px;color:#102e57;font-size:18px;line-height:1.4">${escapeHtml(finding.headline)}</h3><p style="margin:0 0 10px;color:#536483;font-size:12px">${escapeHtml(finding.location)}</p><p style="margin:0;color:#263c54;font-size:15px;line-height:1.65">${escapeHtml(finding.danger)}</p></td></tr></table></td></tr>`).join("")
    : '<tr><td style="padding:0 28px 24px"><p>No flagged findings were returned for this report. This does not guarantee that the contract is risk-free. Review the full report and check the original contract.</p></td></tr>';

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
      `Your private report is available until ${expires} UTC:`,
      content.reportUrl,
      "",
      "For privacy, your uploaded contract and complete report are not attached to this email.",
      "Anyone with this private link can access your report. Keep it private.",
      "Questions? Reply to this email or contact support@explainmycontractnow.com.",
      "Explain My Contract Now | By Tami Stewart Consults",
      "This is educational information, not legal advice. Verify key terms against your original contract.",
    ].join("\n"),
    html: `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><title>Your contract report is ready</title></head>
<body style="margin:0;padding:0;background:#edf2f6;font-family:Arial,Helvetica,sans-serif;color:#263c54;line-height:1.6">
<div style="display:none;max-height:0;overflow:hidden;opacity:0">Your ${escapeHtml(content.agreementType)} report is ready. Open your private report and see what deserves a closer look.</div>
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#edf2f6"><tr><td align="center" style="padding:24px 12px">
<table role="presentation" width="600" cellspacing="0" cellpadding="0" style="width:100%;max-width:600px;background:#ffffff;border:1px solid #d5e0e9;border-radius:16px">
<tr><td style="padding:24px 28px;background:#102e57;border-radius:16px 16px 0 0"><p style="margin:0;color:#ffffff;font-family:Georgia,serif;font-size:25px;line-height:1.2">Explain My Contract Now</p><p style="margin:8px 0 0;color:#b9e5f5;font-size:11px;letter-spacing:1.5px;text-transform:uppercase">By Tami Stewart Consults</p></td></tr>
<tr><td><img src="${escapeHtml(heroImageUrl)}" width="600" alt="A fountain pen signing a contract, with a bright blue flourish." style="display:block;width:100%;max-width:600px;height:auto;border:0"></td></tr>
<tr><td style="padding:28px 28px 12px"><p style="margin:0 0 10px;color:#235d86;font-size:11px;font-weight:bold;letter-spacing:1.5px;text-transform:uppercase">Your full report is ready</p><h1 style="margin:0 0 18px;color:#102e57;font-family:Georgia,serif;font-size:30px;line-height:1.2">A clearer picture<br>of your contract.</h1><p style="margin:0 0 10px;font-size:18px;font-weight:bold;color:#102e57">${escapeHtml(content.agreementType)}</p><p style="margin:0 0 20px;font-size:16px">Your plain-English report is ready to review. See what the contract says, what deserves attention, and which questions to ask next.</p>
<table role="presentation" cellspacing="0" cellpadding="0"><tr><td bgcolor="#061d95" style="border-radius:8px;text-align:center"><a href="${escapeHtml(content.reportUrl)}" style="display:inline-block;border:16px solid #061d95;border-left-width:24px;border-right-width:24px;border-radius:8px;color:#ffffff;text-decoration:none;font-size:16px;font-weight:bold">Open my private report &rarr;</a></td></tr></table>
<p style="margin:14px 0 20px;font-size:13px;color:#536483">Available until <strong>${escapeHtml(expires)} UTC</strong>. Keep this email so you can return to your report before it expires.</p></td></tr>
<tr><td style="padding:0 28px 16px"><h2 style="margin:0;color:#102e57;font-family:Georgia,serif;font-size:24px">A few items to look at</h2><p style="margin:8px 0 0;font-size:14px;color:#536483">These highlights are a starting point. Open your full report for the explanations and next steps.</p></td></tr>
${htmlFindings}
<tr><td style="padding:8px 28px 24px"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#eef8fb;border-left:3px solid #57c4df"><tr><td style="padding:18px"><p style="margin:0 0 6px;font-weight:bold;color:#102e57">Keep your report link private.</p><p style="margin:0;font-size:13px">Anyone with this link can access your report. For privacy, your uploaded contract and complete report are not attached to this email.</p></td></tr></table>
<p style="margin:20px 0 6px;font-size:12px;color:#536483">Button not opening? Copy this private link into your browser:</p><p style="margin:0;font-size:12px;word-break:break-all;overflow-wrap:anywhere"><a href="${escapeHtml(content.reportUrl)}" style="color:#061d95;word-break:break-all">${escapeHtml(content.reportUrl)}</a></p></td></tr>
<tr><td style="padding:24px 28px;border-top:1px solid #d5e0e9"><p style="margin:0 0 8px;font-size:15px;font-weight:bold;color:#102e57">Questions about accessing your report?</p><p style="margin:0 0 20px;font-size:14px">Reply to this email or contact <a href="mailto:support@explainmycontractnow.com" style="color:#061d95">support@explainmycontractnow.com</a>.</p><p style="margin:0;font-size:12px;color:#536483">Educational information, not legal advice. AI can miss context or misunderstand language. Verify key terms against your original contract and consult a qualified attorney when appropriate.</p><p style="margin:18px 0 0;font-size:12px;color:#536483">Explain My Contract Now · Tami Stewart Consults<br><a href="https://explainmycontractnow.com/privacy" style="color:#536483">Privacy &amp; support</a></p></td></tr>
</table></td></tr></table></body></html>`,
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
