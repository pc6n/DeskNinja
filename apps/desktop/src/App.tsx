import { useMemo, useState } from "react";
import { AgentService, ConversationService } from "@deskninja/ai-core";
import {
  DEFAULT_LOCAL_MODEL,
  formatModelOptionLabel,
  getModelContextTokens,
  LOCAL_MODEL_CATALOG,
  modelSupportsTools,
  OLLAMA_PROVIDER_ID,
} from "@deskninja/model-providers";
import { AppTabs, type AppTab } from "./components/AppTabs";
import { PanelDragBar } from "./components/PanelDragBar";
import { PanelResizeHandles } from "./components/PanelResizeHandles";
import { ChatPanel } from "./components/ChatPanel";
import { LocalSetupPanel } from "./components/LocalSetupPanel";
import { TodoPanel } from "./components/TodoPanel";
import { WorkspaceFoldersSettings } from "./components/WorkspaceFoldersSettings";
import { useAppSettings } from "./hooks/useAppSettings";
import { useChatSession } from "./hooks/useChatSession";
import { useLocalSetupWithClient } from "./hooks/useLocalSetup";
import { useTodos } from "./hooks/useTodos";
import { usePanelResize } from "./hooks/usePanelResize";
import { usePanelMode } from "./hooks/usePanelMode";
import { useQuickPanel } from "./hooks/useQuickPanel";
import { showAboutWindow } from "./lib/appInfo";
import { parseChatTodoCommands } from "./lib/chatTodos";
import { openOllamaDownloadPage } from "./lib/openExternal";
import { createDesktopProviderRegistry } from "./lib/providerRegistry";
import { createDesktopToolExecutor } from "./lib/toolExecutor";

export function App() {
  const isPanel = usePanelMode();
  const isQuickPanel = useQuickPanel();
  usePanelResize(isQuickPanel);
  const registry = useMemo(() => createDesktopProviderRegistry(), []);
  const localSetup = useLocalSetupWithClient();
  const todos = useTodos();
  const defaultProviderId = OLLAMA_PROVIDER_ID;
  const toolExecutor = useMemo(() => createDesktopToolExecutor(), []);
  const [conversationService] = useState(
    () => new ConversationService(registry, defaultProviderId),
  );
  const [agentService] = useState(() => new AgentService(registry, defaultProviderId));
  const [providerId, setProviderId] = useState(defaultProviderId);
  const [activeTab, setActiveTab] = useState<AppTab>("chat");
  const [agentMode, setAgentMode] = useState(false);
  const appSettings = useAppSettings();
  const selectedModel = localSetup.state.selectedModel;
  const toolsSupported =
    providerId === OLLAMA_PROVIDER_ID && modelSupportsTools(selectedModel);

  const chat = useChatSession({
    conversationService,
    agentService,
    toolExecutor,
    providerId,
    selectedModel,
    agentMode: agentMode && toolsSupported,
  });

  const providers = registry.list();
  const isReady = localSetup.state.phase === "ready";
  const contextLimit =
    providerId === OLLAMA_PROVIDER_ID
      ? getModelContextTokens(localSetup.state.selectedModel)
      : undefined;

  function handleProviderChange(nextProviderId: string): void {
    setProviderId(nextProviderId);
    conversationService.setProvider(nextProviderId);
    agentService.setProvider(nextProviderId);
  }

  async function handleChatSend(content: string): Promise<void> {
    const { todos: todoTexts, chatContent } = parseChatTodoCommands(content);

    if (todoTexts.length > 0) {
      await Promise.all(todoTexts.map((text) => todos.addTodo(text)));
      if (!chatContent) {
        setActiveTab("todos");
        return;
      }
    }

    await chat.sendMessage(chatContent);
  }

  return (
    <main className={`app-shell${isPanel ? " app-shell--panel" : ""}`}>
      <PanelDragBar />
      <PanelResizeHandles />
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
              <>
                <label className="provider-select">
                  <span>Local model</span>
                  <select
                    value={selectedModel}
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
                <label className="agent-toggle">
                  <input
                    type="checkbox"
                    checked={agentMode && toolsSupported}
                    disabled={!toolsSupported || chat.isStreaming}
                    onChange={(event) => setAgentMode(event.target.checked)}
                  />
                  <span>Agent</span>
                </label>
              </>
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
        <>
          {agentMode && toolsSupported && appSettings.settings ? (
            <WorkspaceFoldersSettings
              settings={appSettings.settings}
              onChange={(next) => {
                void appSettings.updateAllowedPaths(next.allowedPaths ?? []);
              }}
            />
          ) : null}
          {!toolsSupported && providerId === OLLAMA_PROVIDER_ID ? (
            <p className="agent-hint">
              Agent mode needs a tool-capable model (3B+ or Qwen). Switch models to enable file tools.
            </p>
          ) : null}
          <ChatPanel
            messages={chat.messages}
            isStreaming={chat.isStreaming}
            streamPhase={chat.streamPhase}
            metricsByMessageId={chat.metricsByMessageId}
            streamingExcludeIds={chat.streamingExcludeIds}
            toolActivity={chat.toolActivity}
            onSend={handleChatSend}
            modelLabel={selectedModel || DEFAULT_LOCAL_MODEL}
            contextUsage={chat.contextUsage}
            contextLimit={contextLimit}
            agentMode={agentMode && toolsSupported}
          />
        </>
      )}
      </div>
    </main>
  );
}
