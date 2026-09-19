export class GeminiOutputError extends Error {
  readonly status = 502;

  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "GeminiOutputError";
  }
}

function removeJsonCodeFence(value: string): string {
  const match = value.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  return match?.[1] ?? value;
}

export function parseAndValidateGeminiOutput<T>(
  text: string | undefined,
  validate: (value: unknown) => T,
): T {
  if (!text?.trim()) {
    throw new GeminiOutputError("Gemini returned an empty response.");
  }

  try {
    const parsed: unknown = JSON.parse(removeJsonCodeFence(text.trim()));
    return validate(parsed);
  } catch (error) {
    if (error instanceof GeminiOutputError) throw error;

    throw new GeminiOutputError(
      "Gemini returned malformed or schema-invalid JSON.",
      { cause: error },
    );
  }
}
