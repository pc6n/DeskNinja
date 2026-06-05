import { LogicalSize } from "@tauri-apps/api/dpi";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { useEffect } from "react";

const SIZE_KEY = "deskninja.quickPanelSize";
const MIN_WIDTH = 360;
const MIN_HEIGHT = 320;

interface StoredPanelSize {
  width: number;
  height: number;
}

function readStoredSize(): StoredPanelSize | null {
  const raw = localStorage.getItem(SIZE_KEY);
  if (!raw) {
    return null;
  }
  try {
    const parsed = JSON.parse(raw) as StoredPanelSize;
    if (typeof parsed.width !== "number" || typeof parsed.height !== "number") {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function clampSize(size: StoredPanelSize): StoredPanelSize {
  return {
    width: Math.max(MIN_WIDTH, size.width),
    height: Math.max(MIN_HEIGHT, size.height),
  };
}

export function usePanelResize(enabled: boolean): void {
  useEffect(() => {
    if (!enabled) {
      return;
    }

    const window = getCurrentWindow();
    const stored = readStoredSize();
    if (stored) {
      const size = clampSize(stored);
      void window.setSize(new LogicalSize(size.width, size.height));
    }

    let unlisten: (() => void) | undefined;
    void window
      .onResized(async () => {
        const scale = await window.scaleFactor();
        const inner = await window.innerSize();
        const next = clampSize({
          width: inner.width / scale,
          height: inner.height / scale,
        });
        localStorage.setItem(SIZE_KEY, JSON.stringify(next));
      })
      .then((stop) => {
        unlisten = stop;
      });

    return () => {
      unlisten?.();
    };
  }, [enabled]);
}
