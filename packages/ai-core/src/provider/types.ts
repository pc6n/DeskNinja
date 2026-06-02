import type { ChatRequest, ChatResponse } from "../types/chat.js";
import type { ProviderError, Result } from "../types/result.js";
import type { StreamEvent } from "../types/stream.js";

export interface ProviderConfig {
  apiKey?: string;
  baseUrl?: string;
  model?: string;
}

export interface ProviderClient {
  readonly id: string;
  readonly displayName: string;
  sendMessage(request: ChatRequest): Promise<Result<ChatResponse, ProviderError>>;
  streamMessage(request: ChatRequest): AsyncIterable<StreamEvent>;
}

export interface ProviderRegistry {
  register(client: ProviderClient): void;
  get(id: string): ProviderClient | undefined;
  list(): ProviderClient[];
}
