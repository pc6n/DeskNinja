import { getCurrentWindow } from "@tauri-apps/api/window";
import { useQuickPanel } from "../hooks/useQuickPanel";

type ResizeDirection = "East" | "South" | "SouthEast";

const HANDLES: Array<{ className: string; direction: ResizeDirection; label: string }> = [
  { className: "panel-resize-edge panel-resize-edge--east", direction: "East", label: "Resize width" },
  { className: "panel-resize-edge panel-resize-edge--south", direction: "South", label: "Resize height" },
  { className: "panel-resize-corner", direction: "SouthEast", label: "Resize panel" },
];

export function PanelResizeHandles() {
  const isQuickPanel = useQuickPanel();
  if (!isQuickPanel) {
    return null;
  }

  async function handleResize(direction: ResizeDirection): Promise<void> {
    try {
      await getCurrentWindow().startResizeDragging(direction);
    } catch {
      // Resize unavailable outside Tauri.
    }
  }

  return (
    <>
      {HANDLES.map((handle) => (
        <button
          key={handle.direction}
          type="button"
          className={handle.className}
          aria-label={handle.label}
          onMouseDown={() => void handleResize(handle.direction)}
        />
      ))}
    </>
  );
}
