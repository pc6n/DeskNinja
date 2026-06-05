import { isTauriRuntime } from "./runtime";

const OLLAMA_DOWNLOAD_URL = "https://ollama.com/download";
const GITHUB_REPO_URL = "https://github.com/pc6n/DeskNinja";

export async function openGithubRepo(): Promise<void> {
  if (isTauriRuntime()) {
    const { open } = await import("@tauri-apps/plugin-shell");
    await open(GITHUB_REPO_URL);
    return;
  }
  window.open(GITHUB_REPO_URL, "_blank", "noopener,noreferrer");
}

export async function openOllamaDownloadPage(): Promise<void> {
  if (isTauriRuntime()) {
    const { open } = await import("@tauri-apps/plugin-shell");
    await open(OLLAMA_DOWNLOAD_URL);
    return;
  }

  window.open(OLLAMA_DOWNLOAD_URL, "_blank", "noopener,noreferrer");
}
