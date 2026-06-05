import type { ChatMessage } from "../types/chat.js";
import type { StreamEvent } from "../types/stream.js";
import type { ProviderClient } from "../provider/types.js";

export interface ConversationState {
  id: string;
  messages: ChatMessage[];
  activeProviderId: string;
  isStreaming: boolean;
}

export interface SendMessageOptions {
  content: string;
  model?: string;
  onUpdate?: (state: ConversationState) => void;
}

export function createConversationId(): string {
  return crypto.randomUUID();
}

const FORMATTING_SYSTEM_PROMPT =
  "Respond in clear Markdown. Use short paragraphs, bullet lists, headings, and fenced code blocks when helpful.";

function withFormattingSystemPrompt(messages: ChatMessage[]): ChatMessage[] {
  if (messages.some((message) => message.role === "system")) {
    return messages;
  }
  return [createMessage("system", FORMATTING_SYSTEM_PROMPT), ...messages];
}

export function createMessage(role: ChatMessage["role"], content: string): ChatMessage {
  return {
    id: crypto.randomUUID(),
    role,
    content,
    createdAt: new Date(),
  };
}

export class ConversationService {
  private state: ConversationState;

  constructor(
    private readonly registry: { get(id: string): ProviderClient | undefined },
    providerId: string,
  ) {
    this.state = {
      id: createConversationId(),
      messages: [],
      activeProviderId: providerId,
      isStreaming: false,
    };
  }

  getState(): Readonly<ConversationState> {
    return this.state;
  }

  setProvider(providerId: string): void {
    this.state = { ...this.state, activeProviderId: providerId };
  }

  async sendMessage(options: SendMessageOptions): Promise<ConversationState> {
    const provider = this.requireProvider();
    const userMessage = createMessage("user", options.content);

    this.state = {
      ...this.state,
      messages: [...this.state.messages, userMessage],
      isStreaming: true,
    };
    options.onUpdate?.(this.state);

    for await (const event of provider.streamMessage({
      messages: withFormattingSystemPrompt(this.state.messages),
      model: options.model,
    })) {
      this.state = this.applyStreamEvent(event);
      options.onUpdate?.(this.state);
      if (event.type === "error") {
        break;
      }
    }

    this.state = { ...this.state, isStreaming: false };
    options.onUpdate?.(this.state);
    return this.state;
  }

  private requireProvider(): ProviderClient {
    const provider = this.registry.get(this.state.activeProviderId);
    if (!provider) {
      throw new Error(`Provider not found: ${this.state.activeProviderId}`);
    }
    return provider;
  }

  private applyStreamEvent(event: StreamEvent): ConversationState {
    if (event.type === "start") {
      return this.upsertAssistant(event.messageId, "");
    }

    if (event.type === "delta") {
      const current = this.findAssistant(event.messageId)?.content ?? "";
      return this.upsertAssistant(event.messageId, current + event.content);
    }

    if (event.type === "done") {
      return this.upsertAssistant(event.message.id, event.message.content, event.message);
    }

    const errorMessage = createMessage("assistant", `Error: ${event.error.message}`);
    return {
      ...this.state,
      messages: [...this.state.messages, errorMessage],
      isStreaming: false,
    };
  }

  private findAssistant(messageId: string): ChatMessage | undefined {
    return this.state.messages.find((message) => message.id === messageId);
  }

  private upsertAssistant(
    messageId: string,
    content: string,
    finalized?: ChatMessage,
  ): ConversationState {
    const nextMessage = finalized ?? {
      id: messageId,
      role: "assistant" as const,
      content,
      createdAt: this.findAssistant(messageId)?.createdAt ?? new Date(),
    };

    const hasMessage = this.state.messages.some((message) => message.id === messageId);
    const messages = hasMessage
      ? this.state.messages.map((message) =>
          message.id === messageId ? nextMessage : message,
        )
      : [...this.state.messages, nextMessage];

    return { ...this.state, messages };
  }
}
