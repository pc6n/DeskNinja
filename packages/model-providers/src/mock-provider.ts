import type {
  ChatRequest,
  ChatResponse,
  ProviderClient,
  ProviderConfig,
  StreamEvent,
} from "@deskninja/ai-core";
import { createMessage, ok } from "@deskninja/ai-core";

const MOCK_ID = "mock";
const MOCK_NAME = "Mock Provider";

export interface MockProviderOptions {
  delayMs?: number;
  prefix?: string;
}

export class MockProvider implements ProviderClient {
  readonly id = MOCK_ID;
  readonly displayName = MOCK_NAME;

  constructor(
    private readonly config: ProviderConfig = {},
    private readonly options: MockProviderOptions = {},
  ) {}

  async sendMessage(request: ChatRequest) {
    const content = this.buildReply(request);
    return ok<ChatResponse>({
      message: createMessage("assistant", content),
      usage: { promptTokens: 10, completionTokens: content.length, totalTokens: 10 + content.length },
    });
  }

  async *streamMessage(request: ChatRequest): AsyncIterable<StreamEvent> {
    const content = this.buildReply(request);
    const messageId = crypto.randomUUID();

    yield { type: "start", messageId };
    await this.delay();

    for (const chunk of chunkText(content, 12)) {
      yield { type: "delta", messageId, content: chunk };
      await this.delay();
    }

    yield {
      type: "done",
      message: { ...createMessage("assistant", content), id: messageId },
      usage: { promptTokens: 10, completionTokens: content.length, totalTokens: 10 + content.length },
    };
  }

  private buildReply(request: ChatRequest): string {
    const lastUser = [...request.messages].reverse().find((message) => message.role === "user");
    const prefix = this.options.prefix ?? "[Mock]";
    const model = this.config.model ?? "mock-model";
    return `${prefix} (${model}): ${lastUser?.content ?? "No input received."}`;
  }

  private delay(): Promise<void> {
    const ms = this.options.delayMs ?? 40;
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

function chunkText(text: string, size: number): string[] {
  const chunks: string[] = [];
  for (let index = 0; index < text.length; index += size) {
    chunks.push(text.slice(index, index + size));
  }
  return chunks;
}

export function createDefaultProviders(): ProviderClient[] {
  return [new MockProvider({ model: "mock-v1" })];
}
