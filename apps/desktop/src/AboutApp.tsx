import { getCurrentWindow } from "@tauri-apps/api/window";
import { useEffect, useState } from "react";
import { getAppInfo, type AppInfo } from "./lib/appInfo";
import { openGithubRepo } from "./lib/openExternal";

export function AboutApp() {
  const [info, setInfo] = useState<AppInfo | null>(null);

  useEffect(() => {
    void getAppInfo().then(setInfo);
  }, []);

  async function handleClose(): Promise<void> {
    await getCurrentWindow().close();
  }

  return (
    <main className="about-shell">
      <h1>{info?.name ?? "DeskNinja"}</h1>
      <p className="about-version">Version {info?.version ?? "…"}</p>
      <p className="about-tagline">Local AI assistant for macOS</p>
      <dl className="about-meta">
        <div>
          <dt>Shortcut</dt>
          <dd>{info?.shortcutLabel ?? "⌘J"}</dd>
        </div>
        <div>
          <dt>Models</dt>
          <dd>Ollama (on-device)</dd>
        </div>
      </dl>
      <div className="about-actions">
        <button type="button" className="secondary" onClick={() => void openGithubRepo()}>
          GitHub
        </button>
        <button type="button" onClick={() => void handleClose()}>
          Close
        </button>
      </div>
    </main>
  );
}
