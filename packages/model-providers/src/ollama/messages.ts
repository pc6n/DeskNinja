import type { OllamaChatMessage } from "./types.js";

export interface OllamaApiMessage {
  role: string;
  content: string;
  tool_name?: string;
  tool_calls?: Array<{
    type: "function";
    function: {
      name: string;
      arguments: Record<string, unknown> | string;
    };
  }>;
}

export function toOllamaApiMessages(messages: OllamaChatMessage[]): OllamaApiMessage[] {
  return messages.map((message) => {
    const mapped: OllamaApiMessage = {
      role: message.role,
      content: message.content,
    };

    if (message.toolName) {
      mapped.tool_name = message.toolName;
    }

    if (message.toolCalls?.length) {
      mapped.tool_calls = message.toolCalls.map((call) => ({
        type: "function" as const,
        function: {
          name: call.name,
          arguments: call.arguments,
        },
      }));
    }

    return mapped;
  });
}
