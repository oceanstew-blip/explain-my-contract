import {
  getRequestId,
  jsonResponse,
  logServerFailure,
} from "@/lib/request-observability";
import {
  assertDatabaseReady,
  DatabaseReadinessError,
} from "@/lib/readiness";
import {
  getAnalysisEnvironment,
  getCheckoutEnvironment,
  getStripeWebhookEnvironment,
} from "@/lib/server-env";
import { createSupabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function getDeployPreviewDiagnostic(error: unknown) {
  if (
    (process.env.DEPLOY_CONTEXT ?? process.env.CONTEXT) !== "deploy-preview"
  ) {
    return {};
  }

  if (error instanceof DatabaseReadinessError) {
    return {
      diagnostic: {
        stage: "database",
        code: error.code ?? "unknown",
      },
    };
  }

  return { diagnostic: { stage: "configuration" } };
}

export async function GET(request: Request): Promise<Response> {
  const requestId = getRequestId(request.headers);

  try {
    const environment = getAnalysisEnvironment();
    const paymentsEnabled = process.env.STRIPE_CHECKOUT_ENABLED === "true";

    if (paymentsEnabled) {
      getCheckoutEnvironment();
      getStripeWebhookEnvironment();
    }

    const supabase = createSupabaseAdmin(
      environment.NEXT_PUBLIC_SUPABASE_URL,
      environment.SUPABASE_SECRET_KEY,
    );
    await assertDatabaseReady(supabase);

    return jsonResponse(
      requestId,
      {
        status: "ready",
        dependencies: { database: "ok" },
        payments: paymentsEnabled ? "enabled" : "disabled",
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    logServerFailure({
      event: "readiness_check_failed",
      requestId,
      route: "/api/ready",
      error,
    });

    return jsonResponse(
      requestId,
      {
        status: "not_ready",
        request_id: requestId,
        ...getDeployPreviewDiagnostic(error),
      },
      {
        status: 503,
        headers: {
          "Cache-Control": "no-store",
          "Retry-After": "10",
        },
      },
    );
  }
}
