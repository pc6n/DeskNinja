# DeskNinja Implementation Plan

## 1) Scope and Product Definition

### Core V1 outcomes

- Open DeskNinja globally with a shortcut from any app.
- Ask questions against connected providers.
- Insert response into active app via explicit user action.
- Access assistant context from clipboard and optional screenshot.
- Keep all actions permission-gated and auditable.

### Non-goals for V1

- Autonomous background agents with unrestricted actions.
- Full browser automation.
- Team collaboration and cloud sync.

## 2) Technical Architecture

### Desktop shell

- Tauri 2 app with:
  - Rust core for native capabilities and secure boundaries.
  - React UI for chat, settings, provider management.
- Two windows:
  - Main chat/settings window.
  - Lightweight quick panel (spotlight-like overlay).

### Core logic

- `ai-core` package:
  - Provider-agnostic chat request/response models.
  - Conversation state machine and streaming events.
  - Tool-call schema (clipboard/screenshot/insert text).

### Provider adapters

- `model-providers` package:
  - `OpenAIAdapter`
  - `AnthropicAdapter`
  - `OllamaAdapter`
- Unified `ProviderClient` interface with:
  - `sendMessage()`
  - `streamMessage()`
  - standardized errors and rate-limit handling.

### macOS integration

- `macos-bridge` package plus Rust commands for:
  - Global hotkey registration.
  - Clipboard read/write.
  - Active app detection.
  - Optional screenshot capture.
  - Optional "insert into active app" command.

## 3) Security and Permissions

- Secrets stored in macOS Keychain (never plain text files).
- Explicit per-tool permissions with first-use prompt:
  - Clipboard read
  - Clipboard write
  - Screenshot
  - Text insertion
- Request timeouts, retries (bounded), and cancellation for network calls.
- Structured logs without message content by default.

## 4) Milestones

## Milestone A - Project foundation (1-2 days)

- [x] Scaffold monorepo and package boundaries.
- [x] Define TypeScript domain models for chat + providers.
- [x] Add lint/typecheck/test commands.
- [x] Wire Tauri app boot with placeholder windows.

## Milestone B - Multi-provider chat (3-5 days)

- [ ] Implement provider registry and adapter interfaces.
- [ ] Add one fully working provider first (OpenAI).
- [ ] Add streaming response handling to UI.
- [ ] Add provider settings UI (model, key, base URL).

### Local model progress

- [x] `OllamaAdapter` with streaming chat via `/api/chat`
- [x] First-run setup flow (install check, model download, progress)
- [x] Tauri commands: `check_ollama`, `list_ollama_models`, `pull_ollama_model`
- [x] Live streaming updates in chat UI

## Milestone C - Global assistant UX (2-4 days)

- Register global shortcut and quick panel.
- Add clipboard context action.
- Add "copy response" and "insert into active app" actions.
- Add robust error handling for permissions and missing focus target.

## Milestone D - macOS quality hardening (2-3 days)

- Add crash-safe state persistence.
- Improve window focus behavior and tray integration.
- Add app signing/notarization checklist.
- Produce first internal alpha release.

## 5) Delivery Checklist

- [x] `pnpm -r typecheck` passes
- [x] `pnpm -r lint` passes
- [x] basic integration tests for provider abstraction
- [ ] manual test pass for global shortcut + insert workflow
- [ ] release notes template and versioning flow

## 6) Suggested Next Task

Implement Milestone B:

1. Add OpenAI adapter as first real provider.
2. Stream responses into the chat UI incrementally during generation.
3. Add provider settings UI (model, key, base URL).
4. Store API keys in macOS Keychain via Tauri commands.
