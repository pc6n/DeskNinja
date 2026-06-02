import { useMemo, useState } from "react";
import { ConversationService } from "@deskninja/ai-core";
import {
  DEFAULT_LOCAL_MODEL,
  formatModelOptionLabel,
  LOCAL_MODEL_CATALOG,
  OLLAMA_PROVIDER_ID,
} from "@deskninja/model-providers";
import { ChatPanel } from "./components/ChatPanel";
import { LocalSetupPanel } from "./components/LocalSetupPanel";
import { useChatSession } from "./hooks/useChatSession";
import { useLocalSetupWithClient } from "./hooks/useLocalSetup";
import { openOllamaDownloadPage } from "./lib/openExternal";
import { createDesktopProviderRegistry } from "./lib/providerRegistry";

export function App() {
  const registry = useMemo(() => createDesktopProviderRegistry(), []);
  const localSetup = useLocalSetupWithClient();
  const defaultProviderId = OLLAMA_PROVIDER_ID;
  const [service] = useState(() => new ConversationService(registry, defaultProviderId));
  const [providerId, setProviderId] = useState(defaultProviderId);

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
    <main className="app-shell">
      <header className="app-header">
        <div>
          <p className="eyebrow">DeskNinja</p>
          <h1>Desktop Assistant</h1>
        </div>
        {isReady ? (
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

      {!isReady ? (
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
    </main>
  );
}
