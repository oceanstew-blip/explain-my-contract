import { createHmac, timingSafeEqual } from "node:crypto";

import { z } from "zod";

const payloadSchema = z.object({
  contractId: z.uuid(),
  expiresAt: z.number().int().positive(),
  purpose: z.literal("report_email_access"),
});

function signature(payload: string, secret: string): Buffer {
  return createHmac("sha256", secret).update(payload).digest();
}

export function createReportLinkToken(
  contractId: string,
  reportExpiresAt: string,
  secret: string,
): string {
  const expiresAt = Math.floor(new Date(reportExpiresAt).getTime() / 1_000);
  const parsed = payloadSchema.parse({
    contractId,
    expiresAt,
    purpose: "report_email_access",
  });
  const payload = Buffer.from(JSON.stringify(parsed)).toString("base64url");
  return `${payload}.${signature(payload, secret).toString("base64url")}`;
}

export function verifyReportLinkToken(
  token: string,
  expectedContractId: string,
  secret: string,
  nowSeconds = Math.floor(Date.now() / 1_000),
): boolean {
  const [payload, encodedSignature, ...extra] = token.split(".");
  if (!payload || !encodedSignature || extra.length > 0) return false;

  const suppliedSignature = Buffer.from(encodedSignature, "base64url");
  const expectedSignature = signature(payload, secret);
  if (
    suppliedSignature.length !== expectedSignature.length ||
    !timingSafeEqual(suppliedSignature, expectedSignature)
  ) {
    return false;
  }

  try {
    const parsed = payloadSchema.parse(
      JSON.parse(Buffer.from(payload, "base64url").toString("utf8")),
    );
    return parsed.contractId === expectedContractId && parsed.expiresAt >= nowSeconds;
  } catch {
    return false;
  }
}
