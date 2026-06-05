import { useMemo, useState } from "react";
import { ConversationService } from "@deskninja/ai-core";
import {
  DEFAULT_LOCAL_MODEL,
  formatModelOptionLabel,
  LOCAL_MODEL_CATALOG,
  OLLAMA_PROVIDER_ID,
} from "@deskninja/model-providers";
import { AppTabs, type AppTab } from "./components/AppTabs";
import { PanelDragBar } from "./components/PanelDragBar";
import { ChatPanel } from "./components/ChatPanel";
import { LocalSetupPanel } from "./components/LocalSetupPanel";
import { TodoPanel } from "./components/TodoPanel";
import { useChatSession } from "./hooks/useChatSession";
import { useLocalSetupWithClient } from "./hooks/useLocalSetup";
import { useTodos } from "./hooks/useTodos";
import { usePanelMode } from "./hooks/usePanelMode";
import { showAboutWindow } from "./lib/appInfo";
import { openOllamaDownloadPage } from "./lib/openExternal";
import { createDesktopProviderRegistry } from "./lib/providerRegistry";

export function App() {
  const isPanel = usePanelMode();
  const registry = useMemo(() => createDesktopProviderRegistry(), []);
  const localSetup = useLocalSetupWithClient();
  const todos = useTodos();
  const defaultProviderId = OLLAMA_PROVIDER_ID;
  const [service] = useState(() => new ConversationService(registry, defaultProviderId));
  const [providerId, setProviderId] = useState(defaultProviderId);
  const [activeTab, setActiveTab] = useState<AppTab>("chat");

  const chat = useChatSession({
    service,
    providerId,
    selectedModel: localSetup.state.selectedModel,
  });

  const providers = registry.list();
  const isReady = localSetup.state.phase === "ready";

  function handleProviderChange(nextProviderId: string): void {
    setProviderId(nextProviderId);
    service.setProvider(nextProviderId);
  }

  return (
    <main className={`app-shell${isPanel ? " app-shell--panel" : ""}`}>
      <PanelDragBar />
      <header className={`app-header${isPanel ? " app-header--panel" : ""}`}>
        <div>
          {!isPanel ? <p className="eyebrow">DeskNinja</p> : null}
          <h1 className="app-title-row">
            {isPanel ? "DeskNinja" : "Desktop Assistant"}
            {isPanel ? (
              <button
                type="button"
                className="about-link"
                title="About DeskNinja"
                onClick={() => void showAboutWindow()}
              >
                About
              </button>
            ) : null}
          </h1>
          <AppTabs
            activeTab={activeTab}
            openTodoCount={todos.openCount}
            onChange={setActiveTab}
          />
        </div>
        {isReady && activeTab === "chat" ? (
          <div className="header-controls">
            <label className="provider-select">
              <span>Provider</span>
              <select
                value={providerId}
                onChange={(event) => handleProviderChange(event.target.value)}
                disabled={chat.isStreaming}
              >
                {providers.map((provider) => (
                  <option key={provider.id} value={provider.id}>
                    {provider.displayName}
                  </option>
                ))}
              </select>
            </label>
            {providerId === OLLAMA_PROVIDER_ID ? (
              <label className="provider-select">
                <span>Local model</span>
                <select
                  value={localSetup.state.selectedModel}
                  onChange={(event) => void localSetup.switchLocalModel(event.target.value)}
                  disabled={chat.isStreaming}
                >
                  {LOCAL_MODEL_CATALOG.map((model) => (
                    <option key={model.id} value={model.id}>
                      {formatModelOptionLabel(model)}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}
          </div>
        ) : null}
      </header>

      <div className="panel-scroll">
      {activeTab === "todos" ? (
        <TodoPanel
          todos={todos.todos}
          sortMode={todos.sortMode}
          loading={todos.loading}
          error={todos.error}
          onSortModeChange={todos.changeSortMode}
          onAdd={todos.addTodo}
          onToggle={todos.toggleTodoItem}
          onEdit={todos.editTodo}
          onDueChange={todos.updateDue}
          onReorder={todos.reorderOpen}
          onRemove={todos.removeTodo}
        />
      ) : !isReady ? (
        <LocalSetupPanel
          state={localSetup.state}
          onRefresh={localSetup.refresh}
          onDownload={localSetup.downloadModel}
          onSelectModel={localSetup.selectModel}
          onOpenDownloadPage={openOllamaDownloadPage}
          onStartOllama={localSetup.startOllamaApp}
        />
      ) : (
        <ChatPanel
          messages={chat.messages}
          isStreaming={chat.isStreaming}
          streamPhase={chat.streamPhase}
          metricsByMessageId={chat.metricsByMessageId}
          streamingExcludeIds={chat.streamingExcludeIds}
          onSend={chat.sendMessage}
          modelLabel={localSetup.state.selectedModel || DEFAULT_LOCAL_MODEL}
        />
      )}
      </div>
    </main>
  );
}
