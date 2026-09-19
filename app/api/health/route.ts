import { getRequestId, jsonResponse } from "@/lib/request-observability";

export const dynamic = "force-dynamic";

export function GET(request: Request): Response {
  const requestId = getRequestId(request.headers);
  return jsonResponse(
    requestId,
    { status: "ok" },
    { headers: { "Cache-Control": "no-store" } },
  );
}
