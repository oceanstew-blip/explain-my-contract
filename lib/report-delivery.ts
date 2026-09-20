import {
  createAnalysisPreview,
  validateAnalysisResult,
} from "./analysis-config";
import { analysisIntentSchema } from "./analysis-intent";
import { canStartCheckout, paymentStatusSchema } from "./payment-status";
import { parseReportExpiration } from "./report-retention";

type ReportDeliveryInput = {
  contractId: string;
  intent: unknown;
  paymentStatus: string;
  fullReport: unknown;
  checkoutEnabled: boolean;
  checkoutToken?: string;
  reportExpiresAt: string;
  includeFullReportPreview?: boolean;
};

export function createReportDelivery(input: ReportDeliveryInput) {
  const intent = analysisIntentSchema.parse(input.intent);
  const paymentStatus = paymentStatusSchema.parse(input.paymentStatus);
  const report = validateAnalysisResult(intent, input.fullReport);
  const paid = paymentStatus === "paid";
  const fullReportPreview = !paid && input.includeFullReportPreview === true;
  const checkoutEnabled = input.checkoutEnabled && canStartCheckout(paymentStatus);
  const reportExpiresAt = parseReportExpiration(input.reportExpiresAt).toISOString();

  return {
    contract_id: input.contractId,
    intent,
    payment_status: paymentStatus,
    paid,
    preview: createAnalysisPreview(report),
    ...(paid || fullReportPreview ? { report } : {}),
    full_report_preview: fullReportPreview,
    checkout_enabled: checkoutEnabled,
    report_expires_at: reportExpiresAt,
    ...(checkoutEnabled && input.checkoutToken
      ? { checkout_token: input.checkoutToken }
      : {}),
  };
}
