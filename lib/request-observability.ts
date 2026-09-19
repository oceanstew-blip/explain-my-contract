import { randomUUID } from "node:crypto";

const REQUEST_ID_HEADER = "x-request-id";
const SAFE_REQUEST_ID = /^[A-Za-z0-9][A-Za-z0-9_-]{7,63}$/;

type LogLevel = "error" | "warn";

function safeErrorMetadata(error: unknown): Record<string, string | number> {
  if (!error || typeof error !== "object") return {};

  const metadata: Record<string, string | number> = {};
  if (error instanceof Error) metadata.error_name = error.name;

  for (const field of ["code", "status"] as const) {
    const value = Reflect.get(error, field);
    if (
      (typeof value === "string" && /^[A-Za-z0-9_.-]{1,64}$/.test(value)) ||
      (typeof value === "number" && Number.isFinite(value))
    ) {
      metadata[`error_${field}`] = value;
    }
  }

  return metadata;
}

export function getRequestId(headers: Headers): string {
  const supplied = headers.get(REQUEST_ID_HEADER)?.trim();
  return supplied && SAFE_REQUEST_ID.test(supplied) ? supplied : randomUUID();
}

export function jsonResponse(
  requestId: string,
  body: unknown,
  init: ResponseInit = {},
): Response {
  const headers = new Headers(init.headers);
  headers.set("X-Request-ID", requestId);
  return Response.json(body, { ...init, headers });
}

export function errorResponse(
  requestId: string,
  message: string,
  status: number,
  headers?: HeadersInit,
): Response {
  return jsonResponse(
    requestId,
    { error: message, request_id: requestId },
    {
      status,
      headers: {
        "Cache-Control": "no-store",
        ...Object.fromEntries(new Headers(headers)),
      },
    },
  );
}

export function logServerFailure(options: {
  level?: LogLevel;
  event: string;
  requestId: string;
  route: string;
  error: unknown;
  metadata?: Record<string, string | number | boolean | null>;
}): void {
  const payload = {
    event: options.event,
    request_id: options.requestId,
    route: options.route,
    ...safeErrorMetadata(options.error),
    ...options.metadata,
  };

  if (options.level === "warn") console.warn(payload);
  else console.error(payload);
}
