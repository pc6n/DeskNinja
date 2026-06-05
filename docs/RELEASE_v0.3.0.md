# v0.3.0 — Context actions & ⌘J

## Highlights

- **Single shortcut `⌘J`** — opens the panel at the cursor, or context actions when text is selected; press again to hide
- **Context actions** — rephrase, improve, shorten, expand, and custom prompt on selected text (local Ollama)
- **Draggable popup** — drag the frameless window by the grip bar at the top
- **Scrollable content** — model download/setup and long views scroll inside the panel
- **Stability** — removed global mouse hook that could crash on macOS (TSM/main-queue issue)

## Notes

- Context actions need **Accessibility** permission (for copy/paste into other apps)
- Unsigned build: right-click → **Open** on first launch, or `xattr -cr /Applications/DeskNinja.app`

## Download

macOS `.dmg` (Apple Silicon) on [GitHub Releases](https://github.com/pc6n/DeskNinja/releases/tag/v0.3.0).
