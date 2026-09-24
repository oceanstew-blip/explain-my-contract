import { describe, expect, it, vi } from "vitest";

import { GeminiOutputError } from "./gemini-output";
import {
  generateAndValidateOpenAIAnalysis,
  generateOpenAIAnalysis,
} from "./openai-analysis";

const requestOptions = {
  apiKey: "test-key",
  model: "gpt-5.6-terra",
  systemPrompt: "Analyze the contract.",
  userInstruction: "Return the requested report.",
  contractText: "Test contract text.",
  jsonSchema: { type: "object", additionalProperties: false, properties: {} },
  requestId: "00000000-0000-4000-8000-000000000001",
  requestSignal: new AbortController().signal,
  timeoutMs: 30_000,
};

describe("OpenAI contract analysis fallback", () => {
  it("requests a non-stored strict structured response", async () => {
    const fetchImplementation = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(
        JSON.stringify({
          output: [
            {
              type: "message",
              content: [{ type: "output_text", text: '{"ok":true}' }],
            },
          ],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );

    await expect(
      generateOpenAIAnalysis({ ...requestOptions, fetchImplementation }),
    ).resolves.toBe('{"ok":true}');

    const init = fetchImplementation.mock.calls[0]?.[1];
    const body = JSON.parse(String(init?.body)) as {
      model: string;
      store: boolean;
      text: { format: { type: string; strict: boolean } };
    };
    expect(body).toMatchObject({
      model: "gpt-5.6-terra",
      store: false,
      text: { format: { type: "json_schema", strict: true } },
    });
  });

  it("preserves the provider status when OpenAI rejects the request", async () => {
    const fetchImplementation = vi
      .fn<typeof fetch>()
      .mockResolvedValue(new Response("busy", { status: 503 }));

    await expect(
      generateOpenAIAnalysis({ ...requestOptions, fetchImplementation }),
    ).rejects.toMatchObject({
      name: "OpenAIAnalysisError",
      status: 503,
    });
  });

  it("fails closed when the provider response has no analysis text", async () => {
    const fetchImplementation = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(JSON.stringify({ output: [] }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    await expect(
      generateOpenAIAnalysis({ ...requestOptions, fetchImplementation }),
    ).rejects.toThrow("no structured analysis text");
  });

  it("retries one schema-invalid fallback response", async () => {
    const generate = vi
      .fn<() => Promise<string>>()
      .mockResolvedValueOnce('{"ok":false}')
      .mockResolvedValueOnce('{"ok":true}');
    const onInvalidOutput = vi.fn();

    await expect(
      generateAndValidateOpenAIAnalysis({
        generate,
        validate: (output) => {
          const parsed = JSON.parse(output) as { ok?: boolean };
          if (!parsed.ok) throw new GeminiOutputError("Invalid schema");
          return parsed;
        },
        onInvalidOutput,
      }),
    ).resolves.toEqual({ ok: true });

    expect(generate).toHaveBeenCalledTimes(2);
    expect(onInvalidOutput).toHaveBeenCalledWith(
      expect.objectContaining({ attempt: 1, willRetry: true }),
    );
  });

  it("fails closed after three schema-invalid fallback responses", async () => {
    const generate = vi.fn<() => Promise<string>>().mockResolvedValue("{}");

    await expect(
      generateAndValidateOpenAIAnalysis({
        generate,
        validate: () => {
          throw new GeminiOutputError("Invalid schema");
        },
      }),
    ).rejects.toThrow("Invalid schema");

    expect(generate).toHaveBeenCalledTimes(3);
  });
});
