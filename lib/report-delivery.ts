type ReportDeliveryInput = {
  contractId: string;
  intent: unknown;
  paymentStatus: string;
  preview: unknown;
  fullReport: unknown;
  checkoutEnabled: boolean;
  checkoutToken?: string;
};

export function createReportDelivery(input: ReportDeliveryInput) {
  const paid = input.paymentStatus === "paid";

  return {
    contract_id: input.contractId,
    intent: input.intent,
    payment_status: input.paymentStatus,
    paid,
    preview: input.preview,
    ...(paid ? { report: input.fullReport } : {}),
    checkout_enabled: input.checkoutEnabled,
    ...(!paid && input.checkoutToken
      ? { checkout_token: input.checkoutToken }
      : {}),
  };
}
