import { InMemoryProviderRegistry } from "@deskninja/ai-core";
import type { ProviderClient } from "@deskninja/ai-core";
import { MockProvider } from "./mock-provider.js";
import { OllamaAdapter } from "./ollama/adapter.js";

export function createDefaultProviders(): ProviderClient[] {
  return [new OllamaAdapter(), new MockProvider({ model: "mock-v1" })];
}

export function createProviderRegistry(customProviders: ProviderClient[] = []): InMemoryProviderRegistry {
  const registry = new InMemoryProviderRegistry();
  for (const provider of [...createDefaultProviders(), ...customProviders]) {
    registry.register(provider);
  }
  return registry;
}

export { MockProvider } from "./mock-provider.js";
export { OllamaAdapter, OLLAMA_PROVIDER_ID } from "./ollama/adapter.js";
export { OllamaClient, matchesModelName } from "./ollama/client.js";
export type { OllamaTransport } from "./ollama/types.js";
export {
  DEFAULT_LOCAL_MODEL,
  FASTEST_LOCAL_MODEL,
  LOCAL_MODEL_CATALOG,
  findLocalModel,
  formatModelOptionLabel,
  getModelContextTokens,
  modelSupportsTools,
} from "./ollama/catalog.js";
export type { LocalModelOption } from "./ollama/catalog.js";
export type {
  ChatStreamEvent,
  ChatStreamUsage,
  OllamaHealth,
  OllamaChatMessage,
  OllamaToolCall,
  PullProgress,
} from "./ollama/types.js";
export {
  CONTEXT_ACTIONS,
  buildContextMessages,
  findContextAction,
} from "./context/presets.js";
export type { ContextActionDefinition, ContextActionId } from "./context/presets.js";
