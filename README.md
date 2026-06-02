# DeskNinja

Desktop AI assistant for macOS — chat with local models (Ollama) from a clean Tauri + React app.

## Features (v0.1.0)

- **Local Ollama integration** — download and run models on-device
- **First-run setup** — Ollama service detection, model download with progress
- **Streaming chat UI** — thinking/typing indicators and response timing
- **Model catalog** — fast defaults (`llama3.2:1b`) through balanced/quality options
- **Clean monorepo** — provider-agnostic core, swappable adapters

## Requirements

- macOS
- Node.js 20+
- pnpm 9+
- Rust stable + Xcode Command Line Tools
- [Ollama](https://ollama.com/download) for local models

## Quick start

```bash
git clone https://github.com/pc6n/DeskNinja.git
cd DeskNinja
pnpm install
pnpm dev
```

On first launch: start Ollama, pick a model (e.g. **Llama 3.2 1B · Fastest**), download, chat.

## Commands

| Command | Description |
|---|---|
| `pnpm dev` | Tauri desktop app (recommended) |
| `pnpm build` | Build all packages + desktop app |
| `pnpm typecheck` | TypeScript check |
| `pnpm lint` | ESLint |
| `pnpm test` | Vitest unit tests |

Web-only UI (no Tauri): `pnpm --filter @deskninja/desktop dev:web`

## Monorepo layout

- `apps/desktop` — Tauri 2 + React shell
- `packages/ai-core` — conversation domain & provider contracts
- `packages/model-providers` — Ollama adapter, model catalog
- `packages/macos-bridge` — macOS capability stubs (clipboard, etc.)
- `docs/` — architecture & roadmap

## Recommended local model

**`llama3.2:1b`** — fastest on Apple Silicon for quick assistant replies.

```bash
ollama pull llama3.2:1b
```

## License

MIT — see [LICENSE](LICENSE).

## Roadmap

See [docs/IMPLEMENTATION_PLAN.md](docs/IMPLEMENTATION_PLAN.md) — global shortcut, cloud providers (OpenAI), Keychain, quick panel.
