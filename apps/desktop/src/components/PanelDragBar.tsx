import { getCurrentWindow } from "@tauri-apps/api/window";
import { usePanelMode } from "../hooks/usePanelMode";

export function PanelDragBar() {
  const isPanel = usePanelMode();
  if (!isPanel) {
    return null;
  }

  async function handleMouseDown(event: React.MouseEvent<HTMLDivElement>) {
    if (event.button !== 0) {
      return;
    }
    try {
      await getCurrentWindow().startDragging();
    } catch {
      // Webview drag region still applies when startDragging is unavailable.
    }
  }

  return (
    <div
      className="panel-drag-bar"
      data-tauri-drag-region
      onMouseDown={handleMouseDown}
      title="Drag to move"
      aria-label="Drag window"
    >
      <span className="panel-drag-grip" aria-hidden="true" />
    </div>
  );
}
