type ApiErrorPayload = {
  error?: unknown;
  request_id?: unknown;
};

const SAFE_REQUEST_ID = /^[A-Za-z0-9][A-Za-z0-9_-]{7,63}$/;

/** Gateway failures can return HTML instead of the application's JSON. */
export async function readApiJson(response: Response, fallback: string): Promise<Record<string, unknown>> {
  try {
    const payload: unknown = await response.json();
    if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
      throw new Error("Invalid response shape");
    }
    return payload as Record<string, unknown>;
  } catch {
    throw new Error(apiErrorMessage({ request_id: response.headers.get("x-request-id") }, fallback));
  }
}

export function apiErrorMessage(
  payload: ApiErrorPayload,
  fallback: string,
): string {
  const message =
    typeof payload.error === "string" && payload.error.trim()
      ? payload.error
      : fallback;
  const requestId =
    typeof payload.request_id === "string" &&
    SAFE_REQUEST_ID.test(payload.request_id)
      ? payload.request_id
      : null;

  return requestId ? `${message} Support ID: ${requestId}` : message;
}
