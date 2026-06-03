# DeskNinja

Desktop AI assistant for macOS — chat with local models (Ollama) from a clean Tauri + React app.

## Features (v0.2.2)

- **Local Ollama integration** — download and run models on-device
- **First-run setup** — Ollama service detection, model download with progress
- **Streaming chat UI** — thinking/typing indicators and response timing
- **Model catalog** — fast defaults (`llama3.2:1b`) through balanced/quality options
- **Todo tab** — add, complete, edit, delete; optional due date & time
- **Sortable todos** — drag to reorder, or sort by due date / created
- **Global shortcut** — `⌘⇧Space` opens DeskNinja at the cursor (toggle to hide)
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

## Download (macOS)

Download the latest `.dmg` from [GitHub Releases](https://github.com/pc6n/DeskNinja/releases), or build locally (same as [Stash](https://github.com/pc6n/stash)):

```bash
pnpm install
pnpm --filter './packages/*' build
pnpm --filter @deskninja/desktop build
```

Output: `apps/desktop/src-tauri/target/release/bundle/dmg/`

Upload to GitHub Releases:

```bash
gh release upload v0.2.2 apps/desktop/src-tauri/target/release/bundle/dmg/*.dmg --clobber
```

### macOS Gatekeeper (unsigned builds)

Right-click → **Open** once, or:

```bash
xattr -cr /Applications/DeskNinja.app
```

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

See [docs/IMPLEMENTATION_PLAN.md](docs/IMPLEMENTATION_PLAN.md) — cloud providers (OpenAI), Keychain, quick panel.
