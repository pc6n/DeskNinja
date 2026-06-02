import { describe, expect, it } from "vitest";
import { createMessage } from "@deskninja/ai-core";
import { OllamaAdapter } from "./adapter.js";
import type { OllamaClient } from "./client.js";

describe("OllamaAdapter", () => {
  it("maps stream events from Ollama chat API", async () => {
    const mockClient = {
      chatStream: async function* () {
        yield "Mock ";
        yield "reply";
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
    });
  });
});
