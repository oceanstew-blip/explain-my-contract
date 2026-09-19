import {
  createAnalysisPreview,
  validateAnalysisResult,
} from "./analysis-config";
import { analysisIntentSchema } from "./analysis-intent";
import { canStartCheckout, paymentStatusSchema } from "./payment-status";

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
  const checkoutEnabled = input.checkoutEnabled && canStartCheckout(paymentStatus);

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
