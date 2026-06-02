import type {
  ChatRequest,
  ChatResponse,
  ProviderClient,
  ProviderConfig,
  ProviderError,
  StreamEvent,
} from "@deskninja/ai-core";
import { createMessage, err, ok } from "@deskninja/ai-core";
import { OllamaClient } from "./client.js";
import type { OllamaTransport } from "./types.js";
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
      for await (const delta of this.client.chatStream(model, toOllamaMessages(request))) {
        content += delta;
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
      for await (const delta of this.client.chatStream(model, toOllamaMessages(request))) {
        content += delta;
        yield { type: "delta", messageId, content: delta };
      }

      yield {
        type: "done",
        message: { ...createMessage("assistant", content), id: messageId },
      };
    } catch (error) {
      yield { type: "error", error: mapProviderError(error) };
    }
  }

  private resolveModel(request: ChatRequest): string {
    return request.model ?? this.config.model ?? DEFAULT_LOCAL_MODEL;
  }
}

function toOllamaMessages(
  request: ChatRequest,
): Array<{ role: "user" | "assistant" | "system"; content: string }> {
  return request.messages
    .filter((message) => message.role === "user" || message.role === "assistant" || message.role === "system")
    .map((message) => ({
      role: message.role as "user" | "assistant" | "system",
      content: message.content,
    }));
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
