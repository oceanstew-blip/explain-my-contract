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
