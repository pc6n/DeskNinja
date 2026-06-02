import { DEFAULT_LOCAL_MODEL, LOCAL_MODEL_CATALOG } from "@deskninja/model-providers";
import type { LocalSetupState } from "../hooks/useLocalSetup";

interface LocalSetupPanelProps {
  state: LocalSetupState;
  onRefresh: () => Promise<void>;
  onDownload: (model: string) => Promise<void>;
  onSelectModel: (model: string) => void;
  onOpenDownloadPage: () => Promise<void>;
  onStartOllama: () => Promise<void>;
}

export function LocalSetupPanel({
  state,
  onRefresh,
  onDownload,
  onSelectModel,
  onOpenDownloadPage,
  onStartOllama,
}: LocalSetupPanelProps) {
  if (state.phase === "loading") {
    return (
      <section className="setup-panel" aria-live="polite">
        <h2>Checking local AI setup…</h2>
        <p className="setup-status">{state.statusMessage}</p>
      </section>
    );
  }

  if (state.phase === "install") {
    return (
      <section className="setup-panel">
        <h2>Start the Ollama background service</h2>
        <p>
          Ollama runs in the menu bar only — no window is normal. DeskNinja needs the background
          API on port 11434.
        </p>
        <ol className="setup-steps">
          <li>Click Start Ollama Service below.</li>
          <li>Wait until the status shows a connection or model download screen.</li>
          <li>If it still fails, run <code>ollama serve</code> in Terminal and click Recheck.</li>
        </ol>
        {state.statusMessage ? <p className="setup-status">{state.statusMessage}</p> : null}
        <div className="setup-actions">
          <button type="button" onClick={() => void onStartOllama()} disabled={state.isRefreshing}>
            {state.isRefreshing ? "Starting…" : "Start Ollama Service"}
          </button>
          <button type="button" onClick={() => void onOpenDownloadPage()}>
            Download Ollama
          </button>
          <button
            type="button"
            className="secondary"
            disabled={state.isRefreshing}
            onClick={() => void onRefresh()}
          >
            {state.isRefreshing ? "Checking…" : "Recheck"}
          </button>
        </div>
      </section>
    );
  }

  if (state.phase === "download") {
    return (
      <section className="setup-panel">
        <h2>Download a local model</h2>
        <p>Ollama {state.ollamaVersion ? `v${state.ollamaVersion}` : ""} is ready.</p>
        {state.statusMessage ? <p className="setup-status">{state.statusMessage}</p> : null}
        <div className="model-grid">
          {LOCAL_MODEL_CATALOG.map((model) => (
            <label key={model.id} className="model-card">
              <input
                type="radio"
                name="local-model"
                value={model.id}
                checked={state.selectedModel === model.id}
                onChange={() => onSelectModel(model.id)}
              />
              <span className="model-card-body">
                <strong>
                  {model.label}
                  {model.speed === "fastest" ? " · Fastest" : ""}
                </strong>
                <span>{model.sizeLabel}</span>
                <small>{model.description}</small>
              </span>
            </label>
          ))}
        </div>
        {state.pullProgress ? (
          <div className="progress-block" aria-live="polite">
            <p>{formatProgress(state.pullProgress.status, state.pullProgress.percent)}</p>
            {state.pullProgress.percent !== undefined ? (
              <progress max={100} value={state.pullProgress.percent} />
            ) : null}
          </div>
        ) : null}
        {state.error ? <p className="setup-error">{state.error}</p> : null}
        <div className="setup-actions">
          <button
            type="button"
            disabled={isDownloading(state.pullProgress, state.isRefreshing)}
            onClick={() => void onDownload(state.selectedModel || DEFAULT_LOCAL_MODEL)}
          >
            Download {state.selectedModel || DEFAULT_LOCAL_MODEL}
          </button>
          <button type="button" className="secondary" onClick={() => void onRefresh()}>
            Recheck
          </button>
        </div>
      </section>
    );
  }

  return null;
}

function formatProgress(status: string, percent?: number): string {
  if (percent !== undefined) {
    return `${status} (${percent}%)`;
  }
  return status;
}

function isDownloading(progress?: { status: string }, isRefreshing?: boolean): boolean {
  if (isRefreshing) {
    return true;
  }
  if (!progress) {
    return false;
  }
  return progress.status !== "success";
}
