const STREAM_TYPE = "application/x-ndjson";

/** Transport progress separately from the final HTTP result. No model text is
 * exposed until the existing analysis handler has validated and saved it. */
export function streamAnalysisResponse(
  operation: (signal: AbortSignal) => Promise<Response>,
  requestSignal: AbortSignal,
  requestId: string,
): Response {
  const cancellation = new AbortController();
  const signal = AbortSignal.any([
    requestSignal, cancellation.signal, AbortSignal.timeout(55_000),
  ]);
  const encoder = new TextEncoder();
  let closed = false;
  let heartbeat: ReturnType<typeof setInterval> | undefined;
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const send = (value: unknown) => {
        if (!closed) controller.enqueue(encoder.encode(`${JSON.stringify(value)}\n`));
      };
      send({ type: "progress", request_id: requestId });
      heartbeat = setInterval(() => send({ type: "progress" }), 5_000);
      void (async () => {
        try {
          const response = await operation(signal);
          const body: unknown = await response.json();
          send({ type: "result", status: response.status, body,
            retry_after: response.headers.get("retry-after") });
        } catch {
          send({ type: "result", status: 503,
            body: { error: "Analysis is temporarily unavailable. Please try again. You have not been charged.", request_id: requestId } });
        } finally {
          clearInterval(heartbeat);
          if (!closed) { closed = true; controller.close(); }
        }
      })();
    },
    cancel() {
      closed = true;
      clearInterval(heartbeat);
      cancellation.abort();
    },
  });
  return new Response(stream, { headers: {
    "Content-Type": STREAM_TYPE,
    "Cache-Control": "no-store, no-transform",
    "X-Content-Type-Options": "nosniff",
    "X-Request-Id": requestId,
  } });
}

/** Restore the final logical status so callers handle 429/503 exactly as JSON. */
export async function readAnalysisResponse(response: Response): Promise<Response> {
  if (!response.headers.get("content-type")?.includes(STREAM_TYPE)) return response;
  const reader = response.body?.getReader();
  if (!reader) throw new Error("The analysis connection closed. Please try again.");
  const decoder = new TextDecoder();
  let buffer = "";
  try {
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      buffer += decoder.decode(chunk.value, { stream: true });
      if (buffer.length > 1_000_000) throw new Error("Oversized analysis response");
      let boundary: number;
      while ((boundary = buffer.indexOf("\n")) !== -1) {
        const line = buffer.slice(0, boundary);
        buffer = buffer.slice(boundary + 1);
        if (!line.trim()) continue;
        const event = JSON.parse(line);
        if (event.type === "progress") continue;
        if (event.type !== "result" || !Number.isInteger(event.status) ||
            event.status < 200 || event.status > 599 || !event.body ||
            typeof event.body !== "object" || Array.isArray(event.body)) {
          throw new Error("Invalid analysis response");
        }
        const headers = new Headers({ "Content-Type": "application/json" });
        const requestId = response.headers.get("x-request-id");
        if (requestId) headers.set("X-Request-Id", requestId);
        if (typeof event.retry_after === "string") headers.set("Retry-After", event.retry_after);
        return Response.json(event.body, { status: event.status, headers });
      }
    }
    throw new Error("Incomplete analysis response");
  } catch {
    throw new Error("The analysis connection closed before your report was ready. Please try again. You have not been charged.");
  } finally {
    await reader.cancel().catch(() => undefined);
    reader.releaseLock();
  }
}
