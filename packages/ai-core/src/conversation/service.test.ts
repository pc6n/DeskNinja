import { describe, expect, it } from "vitest";
import { InMemoryProviderRegistry } from "../provider/registry.js";
import { ConversationService, createMessage } from "./service.js";
import type { ProviderClient } from "../provider/types.js";
import type { ChatRequest, ChatResponse } from "../types/chat.js";
import { ok } from "../types/result.js";
import type { StreamEvent } from "../types/stream.js";

function createStubProvider(): ProviderClient {
  return {
    id: "stub",
    displayName: "Stub",
    sendMessage: async (request: ChatRequest) =>
      ok<ChatResponse>({
        message: createMessage("assistant", `Echo: ${request.messages.at(-1)?.content ?? ""}`),
      }),
    streamMessage: async function* (request: ChatRequest): AsyncIterable<StreamEvent> {
      const reply = `Echo: ${request.messages.at(-1)?.content ?? ""}`;
      const messageId = crypto.randomUUID();
      yield { type: "start", messageId };
      yield { type: "delta", messageId, content: reply };
      yield {
        type: "done",
        message: { ...createMessage("assistant", reply), id: messageId },
      };
    },
  };
}

describe("ConversationService", () => {
  it("appends user and assistant messages", async () => {
    const registry = new InMemoryProviderRegistry();
    registry.register(createStubProvider());
    const service = new ConversationService(registry, "stub");

    const state = await service.sendMessage({ content: "Hello" });

    expect(state.messages).toHaveLength(2);
    expect(state.messages[0]?.content).toBe("Hello");
    expect(state.messages[1]?.content).toBe("Echo: Hello");
  });
});
