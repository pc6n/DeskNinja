import type {
  ChatRequest,
  ChatResponse,
  ChatToolCall,
  ProviderClient,
  ProviderConfig,
  ProviderError,
  StreamEvent,
  TokenUsage,
} from "@deskninja/ai-core";
import { createMessage, err, ok } from "@deskninja/ai-core";
import { OllamaClient } from "./client.js";
import type { OllamaChatMessage, OllamaToolCall, OllamaTransport } from "./types.js";
import { DEFAULT_LOCAL_MODEL } from "./catalog.js";

export const OLLAMA_PROVIDER_ID = "ollama";

export class OllamaAdapter implements ProviderClient {
  readonly id = OLLAMA_PROVIDER_ID;
  readonly displayName = "Local (Ollama)";

  private readonly client: OllamaTransport;

  constructor(
    private readonly config: ProviderConfig = {},
    client?: OllamaTransport,
  ) {
    this.client = client ?? new OllamaClient({ baseUrl: config.baseUrl });
  }

  async sendMessage(request: ChatRequest) {
    const model = this.resolveModel(request);
    let content = "";

    try {
      for await (const event of this.client.chatStream(
        model,
        toOllamaMessages(request),
        request.tools,
      )) {
        if (event.type === "delta") {
          content += event.content;
        }
      }
    } catch (error) {
      return err(mapProviderError(error));
    }

    return ok<ChatResponse>({
      message: createMessage("assistant", content),
    });
  }

  async *streamMessage(request: ChatRequest): AsyncIterable<StreamEvent> {
    const model = this.resolveModel(request);
    const messageId = crypto.randomUUID();

    yield { type: "start", messageId };

    try {
      let content = "";
      let usage: TokenUsage | undefined;
      let toolCalls: ChatToolCall[] = [];

      for await (const event of this.client.chatStream(
        model,
        toOllamaMessages(request),
        request.tools,
      )) {
        if (event.type === "delta") {
          content += event.content;
          yield { type: "delta", messageId, content: event.content };
          continue;
        }
        if (event.type === "tool_calls") {
          toolCalls = mapToolCalls(event.toolCalls);
          yield { type: "tool_calls", messageId, toolCalls };
          continue;
        }
        usage = event.usage;
      }

      const message = createMessage("assistant", content);
      if (toolCalls.length > 0) {
        message.toolCalls = toolCalls;
      }

      yield {
        type: "done",
        message: { ...message, id: messageId },
        usage,
      };
    } catch (error) {
      yield { type: "error", error: mapProviderError(error) };
    }
  }

  private resolveModel(request: ChatRequest): string {
    return request.model ?? this.config.model ?? DEFAULT_LOCAL_MODEL;
  }
}

function toOllamaMessages(request: ChatRequest): OllamaChatMessage[] {
  return request.messages
    .filter(
      (message) =>
        message.role === "user" ||
        message.role === "assistant" ||
        message.role === "system" ||
        message.role === "tool",
    )
    .map((message) => {
      if (message.role === "tool") {
        return {
          role: "tool" as const,
          content: message.content,
          toolName: message.toolName ?? message.toolCallId ?? "tool",
        };
      }

      const mapped: OllamaChatMessage = {
        role: message.role as "user" | "assistant" | "system",
        content: message.content,
      };

      if (message.toolCalls?.length) {
        mapped.toolCalls = message.toolCalls.map((call) => ({
          id: call.id,
          name: call.name,
          arguments: call.arguments,
        }));
      }

      return mapped;
    });
}

function mapToolCalls(toolCalls: OllamaToolCall[]): ChatToolCall[] {
  return toolCalls.map((call, index) => ({
    id: call.id ?? `tool-${index}`,
    name: call.name,
    arguments: parseToolArguments(call.arguments),
  }));
}

function parseToolArguments(argumentsValue: OllamaToolCall["arguments"]): Record<string, unknown> {
  if (typeof argumentsValue === "string") {
    try {
      return JSON.parse(argumentsValue) as Record<string, unknown>;
    } catch {
      return {};
    }
  }
  return argumentsValue;
}

function mapProviderError(error: unknown): ProviderError {
  const message = error instanceof Error ? error.message : "Unknown Ollama error";
  const lowerMessage = message.toLowerCase();

  if (lowerMessage.includes("fetch") || lowerMessage.includes("network")) {
    return { code: "network", message, retryable: true };
  }

  if (lowerMessage.includes("not found") || lowerMessage.includes("model")) {
    return { code: "unknown", message, retryable: false };
  }

  return { code: "unknown", message, retryable: true };
}
