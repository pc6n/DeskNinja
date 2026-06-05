import { getCurrentWindow } from "@tauri-apps/api/window";
import { useEffect, useState } from "react";

export function usePanelMode(): boolean {
  const [isPanel, setIsPanel] = useState(false);

  useEffect(() => {
    try {
      const label = getCurrentWindow().label;
      setIsPanel(label === "quick-panel" || label === "action-menu");
    } catch {
      setIsPanel(false);
    }
  }, []);

  useEffect(() => {
    document.body.classList.toggle("panel-mode", isPanel);
    return () => document.body.classList.remove("panel-mode");
  }, [isPanel]);

  return isPanel;
}
