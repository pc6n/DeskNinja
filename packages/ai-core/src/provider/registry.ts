import type { ProviderClient, ProviderRegistry } from "./types.js";

export class InMemoryProviderRegistry implements ProviderRegistry {
  private readonly clients = new Map<string, ProviderClient>();

  register(client: ProviderClient): void {
    this.clients.set(client.id, client);
  }

  get(id: string): ProviderClient | undefined {
    return this.clients.get(id);
  }

  list(): ProviderClient[] {
    return [...this.clients.values()];
  }
}
