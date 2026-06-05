import { describe, expect, it } from "vitest";
import { createMessage } from "@deskninja/ai-core";
import { estimateConversationTokens, resolveChatContextUsage } from "./contextUsage";

describe("estimateConversationTokens", () => {
  it("grows as more messages are added", () => {
    const one = estimateConversationTokens([createMessage("user", "Hello")]);
    const two = estimateConversationTokens([
      createMessage("user", "Hello"),
      createMessage("assistant", "Hi there, how can I help?"),
      createMessage("user", "Tell me about Rust"),
    ]);
    expect(two).toBeGreaterThan(one);
  });
});

describe("resolveChatContextUsage", () => {
  it("prefers the larger of estimated history and measured usage", () => {
    const messages = [
      createMessage("user", "Hello"),
      createMessage("assistant", "Hi"),
      createMessage("user", "Another question with more detail"),
    ];
    const resolved = resolveChatContextUsage(messages, {
      promptTokens: 12,
      completionTokens: 8,
      totalTokens: 20,
    });

    expect(resolved?.usage.totalTokens).toBeGreaterThan(20);
    expect(resolved?.approximate).toBe(true);
  });
});
