import { isTauriRuntime } from "./runtime";

const OLLAMA_DOWNLOAD_URL = "https://ollama.com/download";

export async function openOllamaDownloadPage(): Promise<void> {
  if (isTauriRuntime()) {
    const { open } = await import("@tauri-apps/plugin-shell");
    await open(OLLAMA_DOWNLOAD_URL);
    return;
  }

  window.open(OLLAMA_DOWNLOAD_URL, "_blank", "noopener,noreferrer");
}
