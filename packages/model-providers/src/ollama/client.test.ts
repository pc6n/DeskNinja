import { describe, expect, it } from "vitest";
import { matchesModelName, OllamaClient } from "./client.js";

describe("OllamaClient", () => {
  it("reports unreachable health when Ollama is offline", async () => {
    const client = new OllamaClient({
      fetchImpl: async () => {
        throw new Error("connection refused");
      },
    });

    await expect(client.checkHealth()).resolves.toEqual({
      reachable: false,
      error: "connection refused",
    });
  });

  it("lists installed models", async () => {
    const client = new OllamaClient({
      fetchImpl: async (input) => {
        const url = String(input);
        if (url.endsWith("/api/tags")) {
          return new Response(JSON.stringify({ models: [{ name: "qwen3.5:4b" }] }), {
            status: 200,
          });
        }
        throw new Error(`Unexpected request: ${url}`);
      },
    });

    await expect(client.listModels()).resolves.toEqual(["qwen3.5:4b"]);
    await expect(client.hasModel("qwen3.5:4b")).resolves.toBe(true);
  });

  it("streams chat deltas", async () => {
    const body = new ReadableStream({
      start(controller) {
        controller.enqueue(
          new TextEncoder().encode(
            '{"message":{"content":"Hel"}}\n{"message":{"content":"lo"}}\n{"done":true,"prompt_eval_count":12,"eval_count":5}\n',
          ),
        );
        controller.close();
      },
    });

    const client = new OllamaClient({
      fetchImpl: async () => new Response(body, { status: 200 }),
    });

    const deltas: string[] = [];
    let usage: { totalTokens: number } | undefined;
    for await (const event of client.chatStream("qwen3.5:4b", [{ role: "user", content: "Hi" }])) {
      if (event.type === "delta") {
        deltas.push(event.content);
      }
      if (event.type === "usage") {
        usage = event.usage;
      }
    }

    expect(deltas.join("")).toBe("Hello");
    expect(usage?.totalTokens).toBe(17);
  });
});

describe("matchesModelName", () => {
  it("matches exact model tags", () => {
    expect(matchesModelName("qwen3.5:4b", "qwen3.5:4b")).toBe(true);
    expect(matchesModelName("phi3.5:mini", "other:model")).toBe(false);
  });
});
