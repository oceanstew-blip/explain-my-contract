import "server-only";

import type Stripe from "stripe";
import { z } from "zod";

import { validateAnalysisResult } from "@/lib/analysis-config";
import {
  errorResponse,
  getRequestId,
  jsonResponse,
  logServerFailure,
} from "@/lib/request-observability";
import {
  getReportEmailEnvironment,
  getStripeWebhookEnvironment,
} from "@/lib/server-env";
import { sendReportReadyEmail } from "@/lib/report-email";
import { createReportLinkToken } from "@/lib/report-link-token";
import { createStripe } from "@/lib/stripe";
import { completedCheckoutUnlocksReport } from "@/lib/stripe-checkout-completion";
import { paymentStateChangeFromEvent } from "@/lib/stripe-payment-state";
import { createSupabaseAdmin } from "@/lib/supabase-admin";

export const runtime = "nodejs";

function paidCheckoutSession(event: Stripe.Event): Stripe.Checkout.Session | null {
  if (
    event.type !== "checkout.session.completed" &&
    event.type !== "checkout.session.async_payment_succeeded"
  ) {
    return null;
  }

  const session = event.data.object;
  return completedCheckoutUnlocksReport(session) ? session : null;
}

export async function POST(request: Request): Promise<Response> {
  const requestId = getRequestId(request.headers);
  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return errorResponse(requestId, "Missing Stripe signature.", 400);
  }

  let environment: ReturnType<typeof getStripeWebhookEnvironment>;
  let event: Stripe.Event;
  let stripe: ReturnType<typeof createStripe>;

  try {
    environment = getStripeWebhookEnvironment();
    stripe = createStripe(environment.STRIPE_SECRET_KEY);
    event = stripe.webhooks.constructEvent(
      await request.text(),
      signature,
      environment.STRIPE_WEBHOOK_SECRET,
    );
  } catch (error) {
    logServerFailure({
      level: "warn",
      event: "stripe_signature_verification_failed",
      requestId,
      route: "/api/stripe/webhook",
      error,
    });
    return errorResponse(requestId, "Invalid Stripe signature.", 400);
  }

  try {
    const session = paidCheckoutSession(event);
    const supabase = createSupabaseAdmin(
      environment.NEXT_PUBLIC_SUPABASE_URL,
      environment.SUPABASE_SECRET_KEY,
    );

    if (session) {
      const contractId = session.metadata?.contract_id;
      if (!contractId || contractId !== session.client_reference_id) {
        return errorResponse(
          requestId,
          "Checkout session is missing contract metadata.",
          400,
        );
      }

      const { error } = await supabase.rpc("record_paid_checkout", {
        p_contract_id: contractId,
        p_event_id: event.id,
        p_event_type: event.type,
        p_payment_intent_id:
          typeof session.payment_intent === "string"
            ? session.payment_intent
            : session.payment_intent?.id ?? null,
        p_session_id: session.id,
      });

      if (error) throw new Error(`Could not record payment: ${error.message}`);

      const emailEnvironment = getReportEmailEnvironment();
      if (emailEnvironment) {
        const recipient = z.email().safeParse(
          session.customer_details?.email ?? session.customer_email,
        );
        if (!recipient.success) {
          throw new Error("Paid checkout did not include a valid customer email.");
        }

        const [{ data: contract, error: contractError }, { data: analysis, error: analysisError }] =
          await Promise.all([
            supabase
              .from("contracts")
              .select("report_expires_at, report_email_sent_at")
              .eq("id", contractId)
              .single(),
            supabase
              .from("analyses")
              .select("intent, full_report")
              .eq("contract_id", contractId)
              .single(),
          ]);

        if (contractError || !contract || analysisError || !analysis) {
          throw new Error("Could not load the completed report for email delivery.");
        }

        if (!contract.report_email_sent_at) {
          const intent = z.enum(["considering_signing", "already_signed"])
            .parse(analysis.intent);
          const report = validateAnalysisResult(intent, analysis.full_report);
          const reportToken = createReportLinkToken(
            contractId,
            contract.report_expires_at,
            emailEnvironment.REPORT_LINK_TOKEN_SECRET,
          );
          const providerId = await sendReportReadyEmail({
            apiKey: emailEnvironment.RESEND_API_KEY,
            from: emailEnvironment.REPORT_EMAIL_FROM,
            replyTo: emailEnvironment.REPORT_EMAIL_REPLY_TO,
            to: recipient.data,
            contractId,
            content: {
              agreementType: report.agreement_snapshot.agreement_type,
              expiresAt: contract.report_expires_at,
              findings: report.detailed_analysis,
              reportUrl: `${emailEnvironment.APP_BASE_URL}/report/${contractId}#token=${encodeURIComponent(reportToken)}`,
            },
          });
          const { error: emailUpdateError } = await supabase
            .from("contracts")
            .update({
              report_email_sent_at: new Date().toISOString(),
              report_email_provider_id: providerId,
            })
            .eq("id", contractId)
            .is("report_email_sent_at", null);
          if (emailUpdateError) {
            throw new Error("Could not record report email delivery.");
          }
        }
      }
      return jsonResponse(requestId, { received: true });
    }

    const stateChange = await paymentStateChangeFromEvent(
      event,
      (chargeId) => stripe.charges.retrieve(chargeId),
    );
    if (!stateChange) return jsonResponse(requestId, { received: true });

    const { error } = await supabase.rpc("record_payment_state_event", {
      p_event_id: event.id,
      p_event_type: event.type,
      p_payment_intent_id: stateChange.paymentIntentId ?? null,
      p_session_id: stateChange.sessionId ?? null,
      p_target_status: stateChange.targetStatus,
    });

    if (error) {
      throw new Error(`Could not record payment state: ${error.message}`);
    }
    return jsonResponse(requestId, { received: true });
  } catch (error) {
    logServerFailure({
      event: "stripe_webhook_processing_failed",
      requestId,
      route: "/api/stripe/webhook",
      error,
    });
    return errorResponse(
      requestId,
      "Webhook could not be processed.",
      500,
    );
  }
}
