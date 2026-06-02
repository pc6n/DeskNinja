import { InMemoryProviderRegistry } from "@deskninja/ai-core";
import { MockProvider, OllamaAdapter } from "@deskninja/model-providers";
import { createDesktopOllamaTransport } from "./tauriOllamaTransport";

export function createDesktopProviderRegistry(): InMemoryProviderRegistry {
  const transport = createDesktopOllamaTransport();
  const registry = new InMemoryProviderRegistry();
  registry.register(new OllamaAdapter({}, transport));
  registry.register(new MockProvider({ model: "mock-v1" }));
  return registry;
}
