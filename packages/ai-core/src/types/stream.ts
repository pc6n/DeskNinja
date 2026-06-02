import type { ChatMessage, TokenUsage } from "./chat.js";
import type { ProviderError } from "./result.js";

export type StreamEvent =
  | { type: "start"; messageId: string }
  | { type: "delta"; messageId: string; content: string }
  | { type: "done"; message: ChatMessage; usage?: TokenUsage }
  | { type: "error"; error: ProviderError };
