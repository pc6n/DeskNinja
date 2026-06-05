import { useState } from "react";
import { patchAppSettings, type AppSettings } from "../lib/macosBridge";

interface WorkspaceFoldersSettingsProps {
  settings: AppSettings;
  onChange: (settings: AppSettings) => void;
}

export function WorkspaceFoldersSettings({ settings, onChange }: WorkspaceFoldersSettingsProps) {
  const [draftPath, setDraftPath] = useState("");
  const allowedPaths = settings.allowedPaths ?? [];

  async function addPath(): Promise<void> {
    const nextPath = draftPath.trim();
    if (!nextPath || allowedPaths.includes(nextPath)) {
      return;
    }
    const next = await patchAppSettings({
      allowedPaths: [...allowedPaths, nextPath],
    });
    onChange(next);
    setDraftPath("");
  }

  async function removePath(path: string): Promise<void> {
    const next = await patchAppSettings({
      allowedPaths: allowedPaths.filter((item) => item !== path),
    });
    onChange(next);
  }

  return (
    <section className="workspace-settings" aria-label="Workspace folders">
      <h2>Workspace folders</h2>
      <p className="workspace-settings-hint">
        Agent tools can read files under your home folder and any folders you add here.
      </p>
      <ul className="workspace-folder-list">
        <li>~ (home directory)</li>
        {allowedPaths.map((path) => (
          <li key={path}>
            <span>{path}</span>
            <button type="button" onClick={() => void removePath(path)}>
              Remove
            </button>
          </li>
        ))}
      </ul>
      <div className="workspace-folder-add">
        <label className="sr-only" htmlFor="workspace-folder-input">
          Folder path
        </label>
        <input
          id="workspace-folder-input"
          type="text"
          value={draftPath}
          placeholder="/Users/you/projects"
          onChange={(event) => setDraftPath(event.target.value)}
        />
        <button type="button" onClick={() => void addPath()} disabled={!draftPath.trim()}>
          Add folder
        </button>
      </div>
    </section>
  );
}
