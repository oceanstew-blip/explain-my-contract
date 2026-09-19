import { z } from "zod";

import {
  createAnalysisPreview,
  validateAnalysisResult,
} from "./analysis-config";
import { analysisIntentSchema } from "./analysis-intent";

const paymentStatusSchema = z.enum([
  "unpaid",
  "checkout_open",
  "paid",
  "failed",
  "refunded",
]);

type ReportDeliveryInput = {
  contractId: string;
  intent: unknown;
  paymentStatus: string;
  fullReport: unknown;
  checkoutEnabled: boolean;
  checkoutToken?: string;
};

export function createReportDelivery(input: ReportDeliveryInput) {
  const intent = analysisIntentSchema.parse(input.intent);
  const paymentStatus = paymentStatusSchema.parse(input.paymentStatus);
  const report = validateAnalysisResult(intent, input.fullReport);
  const paid = paymentStatus === "paid";
  const checkoutEligible = ["unpaid", "checkout_open", "failed"].includes(
    paymentStatus,
  );
  const checkoutEnabled = input.checkoutEnabled && checkoutEligible;

  return {
    contract_id: input.contractId,
    intent,
    payment_status: paymentStatus,
    paid,
    preview: createAnalysisPreview(report),
    ...(paid ? { report } : {}),
    checkout_enabled: checkoutEnabled,
    ...(checkoutEnabled && input.checkoutToken
      ? { checkout_token: input.checkoutToken }
      : {}),
  };
}
