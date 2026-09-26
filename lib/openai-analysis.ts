type OpenAIResponseContent = {
  type?: string;
  text?: string;
};

type OpenAIResponseOutput = {
  type?: string;
  content?: OpenAIResponseContent[];
};

type OpenAIResponseBody = {
  output?: OpenAIResponseOutput[];
};

export class OpenAIAnalysisError extends Error {
  readonly status?: number;

  constructor(message: string, status?: number) {
    super(message);
    this.name = "OpenAIAnalysisError";
    this.status = status;
  }
}

function extractOutputText(body: OpenAIResponseBody): string {
  for (const output of body.output ?? []) {
    if (output.type !== "message") continue;
    for (const content of output.content ?? []) {
      if (content.type === "output_text" && typeof content.text === "string") {
        return content.text;
      }
    }
  }

  throw new OpenAIAnalysisError("OpenAI returned no structured analysis text.");
}

export async function generateOpenAIAnalysis(options: {
  apiKey: string;
  model: string;
  systemPrompt: string;
  userInstruction: string;
  contractText: string;
  jsonSchema: Record<string, unknown>;
  requestId: string;
  requestSignal: AbortSignal;
  timeoutMs: number;
  fetchImplementation?: typeof fetch;
}): Promise<string> {
  const fetchImplementation = options.fetchImplementation ?? fetch;
  const signal = AbortSignal.any([
    options.requestSignal,
    AbortSignal.timeout(options.timeoutMs),
  ]);
  const response = await fetchImplementation("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${options.apiKey}`,
      "Content-Type": "application/json",
      "X-Client-Request-Id": options.requestId,
    },
    body: JSON.stringify({
      model: options.model,
      instructions: options.systemPrompt,
      input: [
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: [
                options.userInstruction,
                "",
                "<contract_text>",
                options.contractText,
                "</contract_text>",
              ].join("\n"),
            },
          ],
        },
      ],
      max_output_tokens: 8_000,
      reasoning: { effort: "low" },
      store: false,
      text: {
        format: {
          type: "json_schema",
          name: "contract_analysis",
          strict: true,
          schema: options.jsonSchema,
        },
      },
    }),
    signal,
  });

  if (!response.ok) {
    throw new OpenAIAnalysisError(
      `OpenAI analysis failed with HTTP ${response.status}.`,
      response.status,
    );
  }

  return extractOutputText((await response.json()) as OpenAIResponseBody);
}

export async function generateAndValidateOpenAIAnalysis<T>(options: {
  generate: (retryInstruction: string) => Promise<string>;
  validate: (output: string) => T;
  onInvalidOutput?: (details: {
    attempt: number;
    error: GeminiOutputError;
    willRetry: boolean;
  }) => void;
}): Promise<T> {
  const maxAttempts = 3;
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const output = await options.generate(
      attempt === 1
        ? ""
        : "The previous response failed report validation. Return a fresh, complete JSON report matching every schema constraint and the output length limits. Keep explanations and practical steps under 350 characters each. Check total_flags against detailed_analysis.length. Preserve source facts and uncertainty; do not invent or truncate terms.",
    );
    try {
      return options.validate(output);
    } catch (error) {
      if (!(error instanceof GeminiOutputError)) throw error;
      options.onInvalidOutput?.({
        attempt,
        error,
        willRetry: attempt < maxAttempts,
      });
      if (attempt === maxAttempts) throw error;
    }
  }

  throw new GeminiOutputError("OpenAI returned repeated invalid output.");
}
import { GeminiOutputError } from "./gemini-output";
