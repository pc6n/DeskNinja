import { describe, expect, it } from "vitest";
import { createMessage } from "@deskninja/ai-core";
import { OllamaAdapter } from "./adapter.js";
import type { OllamaClient } from "./client.js";

describe("OllamaAdapter", () => {
  it("maps stream events from Ollama chat API", async () => {
    const mockClient = {
      chatStream: async function* () {
        yield { type: "delta", content: "Mock " };
        yield { type: "delta", content: "reply" };
        yield {
          type: "usage",
          usage: { promptTokens: 8, completionTokens: 4, totalTokens: 12 },
        };
      },
    } as unknown as OllamaClient;

    const adapter = new OllamaAdapter({ model: "qwen3.5:4b" }, mockClient);
    const events = [];

    for await (const event of adapter.streamMessage({
      messages: [createMessage("user", "Hello")],
    })) {
      events.push(event);
    }

    expect(events.at(-1)).toMatchObject({
      type: "done",
      message: { content: "Mock reply" },
      usage: { totalTokens: 12 },
    });
  });
});
