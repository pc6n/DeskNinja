import { invoke } from "@tauri-apps/api/core";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import type {
  ChatStreamEvent,
  ChatStreamUsage,
  OllamaChatMessage,
  OllamaHealth,
  OllamaToolCall,
  OllamaTransport,
  PullProgress,
} from "@deskninja/model-providers";
import { matchesModelName, OllamaClient } from "@deskninja/model-providers";
import { isTauriRuntime } from "./runtime";

interface TauriOllamaHealth {
  reachable: boolean;
  version?: string;
  error?: string;
}

interface TauriChatMessageInput {
  role: string;
  content: string;
  toolName?: string;
  toolCalls?: unknown[];
}

export function createDesktopOllamaTransport(): OllamaTransport {
  if (isTauriRuntime()) {
    return new TauriOllamaTransport();
  }
  return new OllamaClient();
}

class TauriOllamaTransport implements OllamaTransport {
  async checkHealth(): Promise<OllamaHealth> {
    try {
      return await invoke<TauriOllamaHealth>("check_ollama");
    } catch (error) {
      return {
        reachable: false,
        error: error instanceof Error ? error.message : "Tauri invoke failed",
      };
    }
  }

  async listModels(): Promise<string[]> {
    return invoke<string[]>("list_ollama_models");
  }

  async hasModel(modelName: string): Promise<boolean> {
    const models = await this.listModels();
    return models.some((name) => matchesModelName(name, modelName));
  }

  async *pullModel(modelName: string): AsyncGenerator<PullProgress> {
    const queue: PullProgress[] = [];
    let resolveWait: (() => void) | null = null;
    let unlisten: UnlistenFn | null = null;
    let invokeError: Error | null = null;
    let finished = false;

    const waitForProgress = (): Promise<void> =>
      new Promise((resolve) => {
        resolveWait = resolve;
      });

    unlisten = await listen<PullProgress>("ollama-pull-progress", (event) => {
      queue.push(event.payload);
      resolveWait?.();
    });

    const invokeTask = invoke("pull_ollama_model", { model: modelName })
      .catch((error: unknown) => {
        invokeError = error instanceof Error ? error : new Error(String(error));
      })
      .finally(() => {
        finished = true;
        resolveWait?.();
      });

    while (!finished || queue.length > 0) {
      if (queue.length === 0) {
        await waitForProgress();
        continue;
      }
      yield queue.shift() as PullProgress;
    }

    await invokeTask;
    await unlisten?.();

    if (invokeError) {
      throw invokeError;
    }
  }

  async *chatStream(
    model: string,
    messages: OllamaChatMessage[],
    tools?: unknown[],
  ): AsyncGenerator<ChatStreamEvent> {
    const queue: ChatStreamEvent[] = [];
    let resolveWait: (() => void) | null = null;
    let unlisten: UnlistenFn | null = null;
    let toolUnlisten: UnlistenFn | null = null;
    let usageUnlisten: UnlistenFn | null = null;
    let invokeError: Error | null = null;
    let finished = false;

    const waitForEvent = (): Promise<void> =>
      new Promise((resolve) => {
        resolveWait = resolve;
      });

    unlisten = await listen<string>("ollama-chat-delta", (event) => {
      queue.push({ type: "delta", content: event.payload });
      resolveWait?.();
    });
    toolUnlisten = await listen<OllamaToolCall[]>("ollama-chat-tool-calls", (event) => {
      queue.push({ type: "tool_calls", toolCalls: event.payload });
      resolveWait?.();
    });
    usageUnlisten = await listen<ChatStreamUsage>("ollama-chat-usage", (event) => {
      queue.push({ type: "usage", usage: event.payload });
      resolveWait?.();
    });

    const invokeTask = invoke("stream_ollama_chat", {
      model,
      messages: toTauriMessages(messages),
      tools: tools?.length ? tools : null,
    })
      .catch((error: unknown) => {
        invokeError = error instanceof Error ? error : new Error(String(error));
      })
      .finally(() => {
        finished = true;
        resolveWait?.();
      });

    while (!finished || queue.length > 0) {
      if (queue.length === 0) {
        await waitForEvent();
        continue;
      }
      yield queue.shift() as ChatStreamEvent;
    }

    await invokeTask;
    await unlisten?.();
    await toolUnlisten?.();
    await usageUnlisten?.();

    if (invokeError) {
      throw invokeError;
    }
  }
}

function toTauriMessages(messages: OllamaChatMessage[]): TauriChatMessageInput[] {
  return messages.map((message) => {
    const mapped: TauriChatMessageInput = {
      role: message.role,
      content: message.content,
    };
    if (message.toolName) {
      mapped.toolName = message.toolName;
    }
    if (message.toolCalls?.length) {
      mapped.toolCalls = message.toolCalls.map((call) => ({
        id: call.id,
        function: {
          name: call.name,
          arguments: call.arguments,
        },
      }));
    }
    return mapped;
  });
}

export async function ensureOllamaRunning(): Promise<OllamaHealth> {
  if (!isTauriRuntime()) {
    return new OllamaClient().checkHealth();
  }
  return invoke<OllamaHealth>("ensure_ollama_running");
}

export async function openOllamaApp(): Promise<OllamaHealth> {
  return ensureOllamaRunning();
}
