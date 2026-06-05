import type {
  ChatStreamEvent,
  ChatStreamUsage,
  OllamaChatChunk,
  OllamaChatMessage,
  OllamaHealth,
  OllamaPullChunk,
  OllamaTagsResponse,
  OllamaTransport,
  OllamaVersionResponse,
  PullProgress,
} from "./types.js";

const DEFAULT_BASE_URL = "http://127.0.0.1:11434";

export interface OllamaClientOptions {
  baseUrl?: string;
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
}

export class OllamaClient implements OllamaTransport {
  private readonly baseUrl: string;
  private readonly fetchImpl: typeof fetch;
  private readonly timeoutMs: number;

  constructor(options: OllamaClientOptions = {}) {
    this.baseUrl = options.baseUrl ?? DEFAULT_BASE_URL;
    this.fetchImpl = options.fetchImpl ?? fetch;
    this.timeoutMs = options.timeoutMs ?? 8_000;
  }

  async checkHealth(): Promise<OllamaHealth> {
    try {
      const response = await this.fetchImpl(`${this.baseUrl}/api/version`, {
        signal: AbortSignal.timeout(this.timeoutMs),
      });
      if (!response.ok) {
        return { reachable: false, error: `HTTP ${response.status}` };
      }
      const payload = (await response.json()) as OllamaVersionResponse;
      return { reachable: true, version: payload.version };
    } catch (error) {
      return {
        reachable: false,
        error: error instanceof Error ? error.message : "Connection failed",
      };
    }
  }

  async listModels(): Promise<string[]> {
    const response = await this.request("/api/tags");
    const payload = (await response.json()) as OllamaTagsResponse;
    return payload.models.map((model) => model.name);
  }

  async hasModel(modelName: string): Promise<boolean> {
    const models = await this.listModels();
    return models.some((name) => matchesModelName(name, modelName));
  }

  async *pullModel(modelName: string): AsyncIterable<PullProgress> {
    const response = await this.fetchImpl(`${this.baseUrl}/api/pull`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: modelName, stream: true }),
    });

    if (!response.ok || !response.body) {
      throw new Error(`Failed to pull model: ${modelName}`);
    }

    for await (const chunk of readNdjson<OllamaPullChunk>(response.body)) {
      yield mapPullProgress(chunk);
    }
  }

  async *chatStream(model: string, messages: OllamaChatMessage[]): AsyncGenerator<ChatStreamEvent> {
    const response = await this.fetchImpl(`${this.baseUrl}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model, messages, stream: true }),
    });

    if (!response.ok || !response.body) {
      const detail = await response.text();
      throw new Error(detail || `Ollama chat failed with status ${response.status}`);
    }

    for await (const chunk of readNdjson<OllamaChatChunk>(response.body)) {
      const delta = chunk.message?.content;
      if (delta) {
        yield { type: "delta", content: delta };
      }
      if (chunk.done) {
        const usage = toChatStreamUsage(chunk);
        if (usage) {
          yield { type: "usage", usage };
        }
      }
    }
  }

  private async request(path: string): Promise<Response> {
    const response = await this.fetchImpl(`${this.baseUrl}${path}`, {
      signal: AbortSignal.timeout(this.timeoutMs),
    });
    if (!response.ok) {
      throw new Error(`Ollama request failed: ${path}`);
    }
    return response;
  }
}

export function matchesModelName(installedName: string, requestedName: string): boolean {
  const installed = installedName.toLowerCase();
  const requested = requestedName.toLowerCase();
  if (installed === requested) {
    return true;
  }

  const [installedModel, installedTag = ""] = installed.split(":", 2);
  const [requestedModel, requestedTag = ""] = requested.split(":", 2);
  if (installedModel !== requestedModel) {
    return false;
  }
  if (!requestedTag) {
    return true;
  }
  if (!installedTag) {
    return false;
  }

  return installedTag === requestedTag || installedTag.startsWith(`${requestedTag}-`);
}

function toChatStreamUsage(chunk: OllamaChatChunk): ChatStreamUsage | undefined {
  const promptTokens = chunk.prompt_eval_count;
  const completionTokens = chunk.eval_count;
  if (promptTokens === undefined && completionTokens === undefined) {
    return undefined;
  }
  const prompt = promptTokens ?? 0;
  const completion = completionTokens ?? 0;
  return {
    promptTokens: prompt,
    completionTokens: completion,
    totalTokens: prompt + completion,
  };
}

function mapPullProgress(chunk: OllamaPullChunk): PullProgress {
  const completed = chunk.completed;
  const total = chunk.total;
  const percent =
    completed !== undefined && total !== undefined && total > 0
      ? Math.round((completed / total) * 100)
      : undefined;

  return {
    status: chunk.status,
    completed,
    total,
    percent,
  };
}

async function* readNdjson<T>(body: ReadableStream<Uint8Array>): AsyncGenerator<T> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) {
        continue;
      }
      yield JSON.parse(trimmed) as T;
    }
  }

  const trailing = buffer.trim();
  if (trailing) {
    yield JSON.parse(trailing) as T;
  }
}
