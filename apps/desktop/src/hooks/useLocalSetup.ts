import { useCallback, useEffect, useMemo, useState } from "react";
import { DEFAULT_LOCAL_MODEL, type OllamaTransport, type PullProgress } from "@deskninja/model-providers";
import { createDesktopOllamaTransport, ensureOllamaRunning } from "../lib/tauriOllamaTransport";
import { isTauriRuntime } from "../lib/runtime";

const SETUP_STORAGE_KEY = "deskninja.localSetup";

export type LocalSetupPhase = "loading" | "install" | "download" | "ready";

export interface LocalSetupState {
  phase: LocalSetupPhase;
  ollamaVersion?: string;
  selectedModel: string;
  pullProgress?: PullProgress;
  error?: string;
  statusMessage?: string;
  isRefreshing: boolean;
}

interface StoredSetup {
  completed: boolean;
  model: string;
}

function readStoredSetup(): StoredSetup | null {
  const raw = localStorage.getItem(SETUP_STORAGE_KEY);
  if (!raw) {
    return null;
  }
  try {
    return JSON.parse(raw) as StoredSetup;
  } catch {
    return null;
  }
}

function writeStoredSetup(model: string): void {
  localStorage.setItem(
    SETUP_STORAGE_KEY,
    JSON.stringify({ completed: true, model } satisfies StoredSetup),
  );
}

export function useLocalSetup(transport: OllamaTransport) {
  const [state, setState] = useState<LocalSetupState>({
    phase: "loading",
    selectedModel: readStoredSetup()?.model ?? DEFAULT_LOCAL_MODEL,
    isRefreshing: true,
    statusMessage: "Checking Ollama…",
  });

  const refresh = useCallback(async (): Promise<void> => {
    let selectedModel = DEFAULT_LOCAL_MODEL;

    setState((current) => {
      selectedModel = readStoredSetup()?.model ?? current.selectedModel;
      return {
        ...current,
        phase: "loading",
        error: undefined,
        isRefreshing: true,
        statusMessage: "Checking Ollama at http://127.0.0.1:11434…",
      };
    });

    const health = await transport.checkHealth();
    if (!health.reachable) {
      const runtimeHint = isTauriRuntime()
        ? "Click Start Ollama Service — the menu bar icon alone is not enough."
        : "Start DeskNinja with pnpm dev (Tauri), not dev:web.";
      const detail = health.error ? ` (${health.error})` : "";
      setState((current) => ({
        ...current,
        phase: "install",
        ollamaVersion: undefined,
        isRefreshing: false,
        statusMessage: `Ollama is not reachable${detail}. ${runtimeHint}`,
      }));
      return;
    }

    const stored = readStoredSetup();
    const hasModel = await transport.hasModel(selectedModel);
    if (stored?.completed && hasModel) {
      setState((current) => ({
        ...current,
        phase: "ready",
        selectedModel,
        ollamaVersion: health.version,
        isRefreshing: false,
        statusMessage: `Connected to Ollama ${health.version ?? ""}`.trim(),
      }));
      return;
    }

    setState((current) => ({
      ...current,
      phase: "download",
      selectedModel,
      ollamaVersion: health.version,
      isRefreshing: false,
      statusMessage: `Ollama ${health.version ?? ""} is running. Choose a model to download.`.trim(),
    }));
  }, [transport]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function downloadModel(model: string): Promise<void> {
    setState((current) => ({
      ...current,
      phase: "download",
      selectedModel: model,
      error: undefined,
      isRefreshing: false,
      pullProgress: { status: "starting" },
      statusMessage: `Downloading ${model}…`,
    }));

    try {
      for await (const progress of transport.pullModel(model)) {
        setState((current) => ({
          ...current,
          pullProgress: progress,
          statusMessage: formatPullStatus(model, progress),
        }));
        if (progress.status === "success") {
          writeStoredSetup(model);
          setState((current) => ({
            ...current,
            phase: "ready",
            selectedModel: model,
            pullProgress: progress,
            statusMessage: `${model} is ready.`,
          }));
          return;
        }
      }

      writeStoredSetup(model);
      setState((current) => ({
        ...current,
        phase: "ready",
        selectedModel: model,
        statusMessage: `${model} is ready.`,
      }));
    } catch (error) {
      const message = error instanceof Error ? error.message : "Download failed";
      setState((current) => ({
        ...current,
        error: message,
        phase: "download",
        pullProgress: undefined,
        statusMessage: `Download failed: ${message}. Click Download again to resume.`,
      }));
    }
  }

  async function startOllamaApp(): Promise<void> {
    setState((current) => ({
      ...current,
      isRefreshing: true,
      statusMessage: "Starting Ollama background service…",
    }));

    try {
      const health = await ensureOllamaRunning();
      if (health.reachable) {
        await refresh();
        return;
      }

      const detail = health.error ? ` (${health.error})` : "";
      setState((current) => ({
        ...current,
        isRefreshing: false,
        statusMessage: `Ollama service still not reachable${detail}. Try: ollama serve in Terminal.`,
      }));
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not start Ollama";
      setState((current) => ({
        ...current,
        isRefreshing: false,
        statusMessage: message,
      }));
    }
  }

  function selectModel(model: string): void {
    setState((current) => ({ ...current, selectedModel: model }));
  }

  async function switchLocalModel(model: string): Promise<void> {
    selectModel(model);

    const hasModel = await transport.hasModel(model);
    if (hasModel) {
      writeStoredSetup(model);
      setState((current) => ({
        ...current,
        phase: "ready",
        selectedModel: model,
        error: undefined,
        statusMessage: `${model} is active.`,
      }));
      return;
    }

    setState((current) => ({
      ...current,
      phase: "download",
      selectedModel: model,
      error: undefined,
      pullProgress: undefined,
      statusMessage: `Download ${model} to start using it.`,
    }));
  }

  return {
    state,
    refresh,
    downloadModel,
    selectModel,
    switchLocalModel,
    startOllamaApp,
  };
}

export function useLocalSetupWithClient() {
  const transport = useMemo(() => createDesktopOllamaTransport(), []);
  return useLocalSetup(transport);
}

function formatPullStatus(model: string, progress: PullProgress): string {
  if (progress.percent !== undefined) {
    return `Downloading ${model}: ${progress.status} (${progress.percent}%)`;
  }
  return `Downloading ${model}: ${progress.status}`;
}
