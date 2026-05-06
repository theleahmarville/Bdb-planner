import { ENV } from "./env";

export type Role = "system" | "user" | "assistant" | "tool" | "function";

export type TextContent = {
  type: "text";
  text: string;
};

export type ImageContent = {
  type: "image_url";
  image_url: {
    url: string;
    detail?: "auto" | "low" | "high";
  };
};

export type FileContent = {
  type: "file_url";
  file_url: {
    url: string;
    mime_type?: "audio/mpeg" | "audio/wav" | "application/pdf" | "audio/mp4" | "video/mp4" ;
  };
};

export type MessageContent = string | TextContent | ImageContent | FileContent;

export type Message = {
  role: Role;
  content: MessageContent | MessageContent[];
  name?: string;
  tool_call_id?: string;
};

export type Tool = {
  type: "function";
  function: {
    name: string;
    description?: string;
    parameters?: Record<string, unknown>;
  };
};

export type ToolChoicePrimitive = "none" | "auto" | "required";
export type ToolChoiceByName = { name: string };
export type ToolChoiceExplicit = {
  type: "function";
  function: {
    name: string;
  };
};

export type ToolChoice =
  | ToolChoicePrimitive
  | ToolChoiceByName
  | ToolChoiceExplicit;

export type InvokeParams = {
  messages: Message[];
  tools?: Tool[];
  toolChoice?: ToolChoice;
  tool_choice?: ToolChoice;
  maxTokens?: number;
  max_tokens?: number;
  outputSchema?: OutputSchema;
  output_schema?: OutputSchema;
  responseFormat?: ResponseFormat;
  response_format?: ResponseFormat;
};

export type ToolCall = {
  id: string;
  type: "function";
  function: {
    name: string;
    arguments: string;
  };
};

export type InvokeResult = {
  id: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: Role;
      content: string | Array<TextContent | ImageContent | FileContent>;
      tool_calls?: ToolCall[];
    };
    finish_reason: string | null;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
};

export type JsonSchema = {
  name: string;
  schema: Record<string, unknown>;
  strict?: boolean;
};

export type OutputSchema = JsonSchema;

export type ResponseFormat =
  | { type: "text" }
  | { type: "json_object" }
  | { type: "json_schema"; json_schema: JsonSchema };

// ─── Anthropic Messages API ─────────────────────────────────────────────────

const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";
const ANTHROPIC_MODEL = "claude-sonnet-4-6";

const assertApiKey = () => {
  if (!ENV.openaiApiKey) {
    throw new Error("OPENAI_API_KEY (Anthropic key) is not configured");
  }
};

/**
 * Extract a plain-text string from any MessageContent value.
 */
const extractText = (content: MessageContent | MessageContent[]): string => {
  if (typeof content === "string") return content;
  const parts = Array.isArray(content) ? content : [content];
  return parts
    .map((p) => (typeof p === "string" ? p : p.type === "text" ? p.text : ""))
    .join("\n");
};

/**
 * Convert our internal message list into Anthropic's format.
 * Returns { system, messages } – Anthropic wants system as a top-level param.
 */
function buildAnthropicMessages(messages: Message[]): {
  system: string | undefined;
  messages: Array<{ role: "user" | "assistant"; content: string }>;
} {
  let system: string | undefined;
  const out: Array<{ role: "user" | "assistant"; content: string }> = [];

  for (const msg of messages) {
    const text = extractText(msg.content);

    if (msg.role === "system") {
      // Anthropic uses a top-level system param; merge multiple system messages
      system = system ? `${system}\n\n${text}` : text;
      continue;
    }

    // Map tool/function roles to user (these carry tool results)
    const role: "user" | "assistant" =
      msg.role === "assistant" ? "assistant" : "user";

    // Anthropic requires alternating roles – merge consecutive same-role msgs
    if (out.length > 0 && out[out.length - 1].role === role) {
      out[out.length - 1].content += "\n\n" + text;
    } else {
      out.push({ role, content: text });
    }
  }

  // Anthropic requires the first message to be "user"
  if (out.length > 0 && out[0].role !== "user") {
    out.unshift({ role: "user", content: "(conversation start)" });
  }

  return { system, messages: out };
}

/**
 * If caller asked for JSON output (via response_format or output_schema),
 * append instructions to the system prompt so Claude responds with JSON.
 */
function applyJsonInstructions(
  system: string | undefined,
  params: InvokeParams
): string | undefined {
  const fmt = params.responseFormat || params.response_format;
  const schema = params.outputSchema || params.output_schema;

  if (fmt?.type === "json_schema" && fmt.json_schema?.schema) {
    const extra = `\n\nIMPORTANT: You MUST respond with valid JSON only — no markdown fences, no extra text. Follow this JSON schema:\n${JSON.stringify(fmt.json_schema.schema, null, 2)}`;
    return (system || "") + extra;
  }

  if (fmt?.type === "json_object") {
    return (system || "") + "\n\nIMPORTANT: Respond with valid JSON only — no markdown fences, no extra text.";
  }

  if (schema?.schema) {
    const extra = `\n\nIMPORTANT: You MUST respond with valid JSON only — no markdown fences, no extra text. Follow this JSON schema:\n${JSON.stringify(schema.schema, null, 2)}`;
    return (system || "") + extra;
  }

  return system;
}

/**
 * Call the Anthropic Messages API and return an InvokeResult that matches
 * the shape every caller already expects (OpenAI-compatible structure).
 */
export async function invokeLLM(params: InvokeParams): Promise<InvokeResult> {
  assertApiKey();

  const { system: rawSystem, messages } = buildAnthropicMessages(params.messages);
  const system = applyJsonInstructions(rawSystem, params);
  const maxTokens = params.maxTokens || params.max_tokens || 4096;

  const body: Record<string, unknown> = {
    model: ANTHROPIC_MODEL,
    max_tokens: maxTokens,
    messages,
  };

  if (system) {
    body.system = system;
  }

  // 30-second timeout to prevent hanging requests
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30_000);

  let response: Response;
  try {
    response = await fetch(ANTHROPIC_API_URL, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": ENV.openaiApiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
  } catch (err: any) {
    clearTimeout(timeout);
    if (err?.name === "AbortError") {
      throw new Error("Anthropic API request timed out after 30 seconds");
    }
    throw err;
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Anthropic API error: ${response.status} ${response.statusText} – ${errorText}`
    );
  }

  const data = (await response.json()) as {
    id: string;
    model: string;
    content: Array<{ type: string; text?: string }>;
    stop_reason: string | null;
    usage?: { input_tokens: number; output_tokens: number };
  };

  // Extract text from response content blocks
  const textContent = data.content
    .filter((block) => block.type === "text" && block.text)
    .map((block) => block.text!)
    .join("");

  // Return in the InvokeResult shape so all callers continue to work unchanged
  return {
    id: data.id,
    created: Math.floor(Date.now() / 1000),
    model: data.model,
    choices: [
      {
        index: 0,
        message: {
          role: "assistant",
          content: textContent,
        },
        finish_reason: data.stop_reason === "end_turn" ? "stop" : (data.stop_reason || "stop"),
      },
    ],
    usage: data.usage
      ? {
          prompt_tokens: data.usage.input_tokens,
          completion_tokens: data.usage.output_tokens,
          total_tokens: data.usage.input_tokens + data.usage.output_tokens,
        }
      : undefined,
  };
}
