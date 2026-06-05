import { getCurrentWindow } from "@tauri-apps/api/window";
import { useEffect, useState } from "react";

export function useQuickPanel(): boolean {
  const [isQuickPanel, setIsQuickPanel] = useState(false);

  useEffect(() => {
    try {
      setIsQuickPanel(getCurrentWindow().label === "quick-panel");
    } catch {
      setIsQuickPanel(false);
    }
  }, []);

  return isQuickPanel;
}
