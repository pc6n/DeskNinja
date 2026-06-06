# v0.3.5 — Agent reliability and shortcut polish

## Highlights

- **Smarter repo exploration** — `explore_repo` scans key project files and skips `node_modules`, `target`, `.git`, etc.
- **Path bootstrap** — paste a file or repo path in chat and the agent reads it automatically
- **Reliable tool calling** — Ollama tool messages use correct snake_case; text JSON tool calls are parsed as fallback
- **Forced summary round** — agent waits for tool results before answering instead of hallucinating early
- **Context panel fix** — streaming context actions no longer show `[object Object]`
- **Shortcut split** — `⌘J` toggles chat/todo; `⌘⇧J` opens context actions on selected text
- **Path sandbox** — tilde expansion, relative paths in allowed roots, broader text file types

## Notes

- Agent works best with **Llama 3.2 3B** or **Qwen 3.5 4B**; add project folders under workspace settings for repo scans
- Unsigned build: right-click → **Open** on first launch, or `xattr -cr /Applications/DeskNinja.app`

## Download

macOS `.dmg` (Apple Silicon) on [GitHub Releases](https://github.com/pc6n/DeskNinja/releases/tag/v0.3.5).
