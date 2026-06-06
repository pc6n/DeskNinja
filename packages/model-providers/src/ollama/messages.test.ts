import { describe, expect, it } from "vitest";
import { toOllamaApiMessages } from "./messages.js";

describe("toOllamaApiMessages", () => {
  it("serializes tool fields in snake_case for the Ollama API", () => {
    const payload = toOllamaApiMessages([
      {
        role: "tool",
        content: "README.md (file): /Users/test/README.md",
        toolName: "list_dir",
      },
      {
        role: "assistant",
        content: "",
        toolCalls: [
          {
            id: "call-1",
            name: "read_files",
            arguments: { paths: ["/Users/test/README.md"] },
          },
        ],
      },
    ]);

    expect(payload[0]).toMatchObject({
      role: "tool",
      tool_name: "list_dir",
    });
    expect(payload[0]).not.toHaveProperty("toolName");
    expect(payload[1]?.tool_calls?.[0]).toMatchObject({
      type: "function",
      function: { name: "read_files" },
    });
  });
});
