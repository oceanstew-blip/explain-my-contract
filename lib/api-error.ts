type ApiErrorPayload = {
  error?: unknown;
  request_id?: unknown;
};

const SAFE_REQUEST_ID = /^[A-Za-z0-9][A-Za-z0-9_-]{7,63}$/;

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
