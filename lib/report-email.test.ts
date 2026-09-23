import { describe, expect, it, vi } from "vitest";

import { renderReportReadyEmail, sendReportReadyEmail } from "./report-email";

const content = {
  agreementType: "Residential lease <draft>",
  expiresAt: "2026-10-23T12:00:00.000Z",
  findings: [
    {
      headline: "Sixty-day renewal notice",
      attention_level: "important" as const,
      danger: "The contract says a late request may not be considered.",
      location: "Section 14",
    },
    {
      headline: "Broad damage charge",
      attention_level: "high_attention" as const,
      danger: "The tenant may be charged for broadly described damage.",
      location: "Section 8",
    },
  ],
  reportUrl: "https://contracts.example.com/report/123#token=private-token",
};

describe("report-ready email", () => {
  it("renders a privacy-limited summary with high-attention items first", () => {
    const email = renderReportReadyEmail(content);

    expect(email.subject).toContain("Residential lease");
    expect(email.text.indexOf("Broad damage charge")).toBeLessThan(
      email.text.indexOf("Sixty-day renewal notice"),
    );
    expect(email.text).toMatch(/not attached/i);
    expect(email.text).toContain(content.reportUrl);
    expect(email.html).toContain("Residential lease &lt;draft&gt;");
    expect(email.html).toContain("Open my private report");
    expect(email.html).not.toContain("Residential lease <draft>");
  });

  it("sends with a stable per-report idempotency key", async () => {
    const fetchImplementation = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ id: "email_123" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    await expect(sendReportReadyEmail({
      apiKey: "re_test",
      from: "Explain My Contract <reports@example.com>",
      replyTo: "support@example.com",
      to: "tester@example.com",
      contractId: "11111111-1111-4111-8111-111111111111",
      content,
      fetchImplementation,
    })).resolves.toBe("email_123");

    expect(fetchImplementation).toHaveBeenCalledWith(
      "https://api.resend.com/emails",
      expect.objectContaining({
        headers: expect.objectContaining({
          "Idempotency-Key": "report-ready/11111111-1111-4111-8111-111111111111",
        }),
      }),
    );
  });
});
