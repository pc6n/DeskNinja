import type { ChatMessage, TokenUsage } from "@deskninja/ai-core";
import { FORMATTING_SYSTEM_PROMPT } from "@deskninja/ai-core";

const ROLE_OVERHEAD_TOKENS = 4;

export function estimateTokens(text: string): number {
  const trimmed = text.trim();
  if (!trimmed) {
    return 0;
  }
  return Math.max(1, Math.ceil(trimmed.length / 4));
}

export function estimateConversationTokens(
  messages: Array<Pick<ChatMessage, "content">>,
  systemPrompt: string = FORMATTING_SYSTEM_PROMPT,
): number {
  const systemTokens = estimateTokens(systemPrompt);
  const messageTokens = messages.reduce(
    (sum, message) => sum + estimateTokens(message.content) + ROLE_OVERHEAD_TOKENS,
    0,
  );
  return systemTokens + messageTokens;
}

export interface ResolvedContextUsage {
  usage: TokenUsage;
  approximate: boolean;
}

export function resolveChatContextUsage(
  messages: ChatMessage[],
  measured?: TokenUsage,
): ResolvedContextUsage | undefined {
  if (messages.length === 0) {
    return undefined;
  }

  const estimated = estimateConversationTokens(messages);
  const measuredTotal = measured?.totalTokens ?? 0;
  const totalTokens = Math.max(estimated, measuredTotal);

  return {
    usage: {
      promptTokens: measured?.promptTokens ?? estimated,
      completionTokens: measured?.completionTokens ?? 0,
      totalTokens,
    },
    approximate: estimated >= measuredTotal,
  };
}
