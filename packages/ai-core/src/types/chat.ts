export type MessageRole = "user" | "assistant" | "system" | "tool";

export interface ChatToolCall {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
}

export interface ChatMessage {
  id: string;
  role: MessageRole;
  content: string;
  createdAt: Date;
  toolCalls?: ChatToolCall[];
  toolCallId?: string;
  toolName?: string;
}

export interface ChatRequest {
  messages: ChatMessage[];
  model?: string;
  temperature?: number;
  tools?: unknown[];
}

export interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

export interface ChatResponse {
  message: ChatMessage;
  usage?: TokenUsage;
}
