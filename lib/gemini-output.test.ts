import { describe, expect, it } from "vitest";

import {
  GeminiOutputError,
  parseAndValidateGeminiOutput,
} from "./gemini-output";

describe("Gemini output handling", () => {
  const validate = (value: unknown) => {
    if (
      typeof value !== "object" ||
      value === null ||
      !("ok" in value) ||
      value.ok !== true
    ) {
      throw new Error("Invalid shape");
    }

    return value as { ok: true };
  };

  it("parses and validates plain JSON", () => {
    expect(parseAndValidateGeminiOutput('{"ok":true}', validate)).toEqual({
      ok: true,
    });
  });

  it("accepts a single JSON code fence", () => {
    expect(
      parseAndValidateGeminiOutput('```json\n{"ok":true}\n```', validate),
    ).toEqual({ ok: true });
  });

  it.each([undefined, "", "not json", '{"ok":false}', '{"ok":true'])(
    "turns empty, malformed, or invalid output into a retryable upstream error",
    (text) => {
      expect(() => parseAndValidateGeminiOutput(text, validate)).toThrow(
        GeminiOutputError,
      );

      try {
        parseAndValidateGeminiOutput(text, validate);
      } catch (error) {
        expect(error).toMatchObject({ status: 502 });
      }
    },
  );
});
