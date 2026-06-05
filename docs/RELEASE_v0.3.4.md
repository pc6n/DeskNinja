# v0.3.4 — Agent workspace tools

## Highlights

- **Agent mode** — toggle in chat when using a tool-capable local model (3B+ or Qwen)
- **File reading** — agent can read, batch-read, and list files inside allowed folders
- **Read-only shell** — allowlisted commands (`ls`, `find`, `head`, `tail`, `wc`, `cat`) with path sandbox
- **Workspace folders** — add extra allowed directories beyond your home folder
- **Tool activity** — compact status in chat while tools run (e.g. “Reading `src/foo.ts`…”)
- **Ollama tool calling** — native `tool_calls` loop with up to 8 rounds per message

## Notes

- Agent works best with **Llama 3.2 3B** or **Qwen 3.5 4B**; the 1B model is not marked as tool-capable
- Unsigned build: right-click → **Open** on first launch, or `xattr -cr /Applications/DeskNinja.app`

## Download

macOS `.dmg` (Apple Silicon) on [GitHub Releases](https://github.com/pc6n/DeskNinja/releases/tag/v0.3.4).
