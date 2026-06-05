export interface OllamaHealth {
  reachable: boolean;
  version?: string;
  error?: string;
}

export interface PullProgress {
  status: string;
  completed?: number;
  total?: number;
  percent?: number;
}

export interface OllamaToolCall {
  id?: string;
  name: string;
  arguments: Record<string, unknown> | string;
}

export interface OllamaChatMessage {
  role: "user" | "assistant" | "system" | "tool";
  content: string;
  toolName?: string;
  toolCalls?: OllamaToolCall[];
}

export interface OllamaTagsResponse {
  models: Array<{ name: string }>;
}

export interface OllamaVersionResponse {
  version: string;
}

export interface OllamaChatChunk {
  message?: {
    role?: string;
    content?: string;
    tool_calls?: Array<{
      id?: string;
      function?: { name?: string; arguments?: Record<string, unknown> | string };
    }>;
  };
  done?: boolean;
  eval_count?: number;
  prompt_eval_count?: number;
}

export interface ChatStreamUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

export type ChatStreamEvent =
  | { type: "delta"; content: string }
  | { type: "usage"; usage: ChatStreamUsage }
  | { type: "tool_calls"; toolCalls: OllamaToolCall[] };

export interface OllamaPullChunk {
  status: string;
  total?: number;
  completed?: number;
}

export interface OllamaTransport {
  checkHealth(): Promise<OllamaHealth>;
  listModels(): Promise<string[]>;
  hasModel(modelName: string): Promise<boolean>;
  pullModel(modelName: string): AsyncIterable<PullProgress>;
  chatStream(
    model: string,
    messages: OllamaChatMessage[],
    tools?: unknown[],
  ): AsyncIterable<ChatStreamEvent>;
}
