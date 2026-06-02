import { describe, expect, it } from "vitest";
import { MockProvider } from "./mock-provider.js";
import { createMessage } from "@deskninja/ai-core";

describe("MockProvider", () => {
  it("streams a mock response", async () => {
    const provider = new MockProvider({ model: "test" }, { delayMs: 0 });
    const request = {
      messages: [createMessage("user", "Hi")],
    };

    const events = [];
    for await (const event of provider.streamMessage(request)) {
      events.push(event);
    }

    expect(events.at(-1)).toMatchObject({
      type: "done",
      message: { content: expect.stringContaining("Hi") },
    });
  });
});
