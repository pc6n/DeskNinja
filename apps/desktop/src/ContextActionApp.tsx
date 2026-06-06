import { listen } from "@tauri-apps/api/event";
import { useEffect, useState } from "react";
import type { ContextActionId } from "@deskninja/model-providers";
import { DEFAULT_LOCAL_MODEL } from "@deskninja/model-providers";
import { PanelDragBar } from "./components/PanelDragBar";
import { ContextActionList } from "./components/context/ContextActionList";
import { ContextCustomPrompt } from "./components/context/ContextCustomPrompt";
import { ContextResult } from "./components/context/ContextResult";
import { PermissionBanner } from "./components/context/PermissionBanner";
import { useAppSettings } from "./hooks/useAppSettings";
import { useContextAction } from "./hooks/useContextAction";
import { useLocalSetupWithClient } from "./hooks/useLocalSetup";
import { insertText, getSelectedText } from "./lib/macosBridge";

type View = "actions" | "custom" | "result";

interface OpenPayload {
  selectedText: string | null;
}

export function ContextActionApp() {
  const localSetup = useLocalSetupWithClient();
  const appSettings = useAppSettings();
  const model = localSetup.state.selectedModel || DEFAULT_LOCAL_MODEL;
  const context = useContextAction(model);
  const [view, setView] = useState<View>("actions");
  const [selection, setSelection] = useState<string | null>(null);
  const [customDraft, setCustomDraft] = useState("");
  const [lastAction, setLastAction] = useState<ContextActionId>("rephrase");

  useEffect(() => {
    const unlistenPromise = listen<OpenPayload>("action-menu:open", () => {
      setView("actions");
      setCustomDraft("");
      context.reset();
      void getSelectedText().then((result) => {
        setSelection(result.text);
      });
    });
    return () => {
      void unlistenPromise.then((dispose) => dispose());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount once
  }, []);

  async function runAction(actionId: ContextActionId, customPrompt?: string): Promise<void> {
    if (!selection?.trim()) {
      return;
    }
    setLastAction(actionId);
    setView("result");
    await context.runAction(actionId, selection, customPrompt);
  }

  function handleSelectAction(actionId: ContextActionId): void {
    if (actionId === "custom") {
      setView("custom");
      return;
    }
    void runAction(actionId);
  }

  async function handleInsert(): Promise<void> {
    if (!context.result) {
      return;
    }
    await insertText(context.result);
  }

  async function handleCopy(): Promise<void> {
    if (!context.result) {
      return;
    }
    await navigator.clipboard.writeText(context.result);
  }

  const showPermission =
    appSettings.settings && !appSettings.accessibilityTrusted;

  return (
    <main className="app-shell app-shell--panel app-shell--context">
      <PanelDragBar />
      <header className="app-header app-header--panel">
        <h1>DeskNinja</h1>
        <p className="context-hint">⌘⇧J · with selection → context actions · ⌘J → chat</p>
      </header>

      <div className="panel-scroll">
      {showPermission ? (
        <PermissionBanner
          trusted={appSettings.accessibilityTrusted}
          prompted={appSettings.settings?.accessibilityPrompted ?? false}
          onOpenSettings={() => void appSettings.openAccessibilitySettings()}
          onDismiss={() => void appSettings.markAccessibilityPrompted()}
        />
      ) : null}

      {view === "actions" ? (
        <>
          <ContextActionList
            selectionPreview={selection}
            disabled={context.isStreaming}
            onSelect={handleSelectAction}
          />
          <button
            type="button"
            className="context-custom-entry"
            disabled={!selection || context.isStreaming}
            onClick={() => setView("custom")}
          >
            Custom prompt…
          </button>
        </>
      ) : null}

      {view === "custom" ? (
        <ContextCustomPrompt
          draft={customDraft}
          disabled={context.isStreaming || !selection}
          onDraftChange={setCustomDraft}
          onRun={() => void runAction("custom", customDraft)}
          onBack={() => setView("actions")}
        />
      ) : null}

      {view === "result" ? (
        <ContextResult
          result={context.result}
          isStreaming={context.isStreaming}
          error={context.error}
          onCopy={() => void handleCopy()}
          onInsert={() => void handleInsert()}
          onRetry={() => void runAction(lastAction, customDraft || undefined)}
          onBack={() => {
            setView("actions");
            context.reset();
          }}
        />
      ) : null}
      </div>
    </main>
  );
}
