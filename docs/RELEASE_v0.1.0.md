# v0.1.0 — First alpha

Initial public release of DeskNinja: a macOS desktop assistant with local Ollama support.

## Highlights

- Tauri 2 + React monorepo (`ai-core`, `model-providers`, `macos-bridge`)
- Ollama setup flow: service start, model download, progress UI
- Streaming chat with thinking/typing states and timing metrics
- Model catalog with speed tiers (default: `llama3.2:1b`)
- Rust-side Ollama proxy (no browser CORS issues)

## Install

```bash
git clone https://github.com/pc6n/DeskNinja.git
cd DeskNinja
pnpm install
pnpm dev
```

Requires Ollama: https://ollama.com/download

## Known limits

- macOS only in this release
- Local Ollama only (no OpenAI/Anthropic yet)
- No global shortcut / quick panel yet
- No Keychain for API keys yet

See `docs/IMPLEMENTATION_PLAN.md` for the roadmap.
