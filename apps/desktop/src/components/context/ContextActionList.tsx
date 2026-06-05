import { CONTEXT_ACTIONS, type ContextActionId } from "@deskninja/model-providers";

interface ContextActionListProps {
  selectionPreview: string | null;
  disabled: boolean;
  onSelect: (actionId: ContextActionId) => void;
}

export function ContextActionList({
  selectionPreview,
  disabled,
  onSelect,
}: ContextActionListProps) {
  const preview =
    selectionPreview && selectionPreview.length > 80
      ? `${selectionPreview.slice(0, 80)}…`
      : selectionPreview;

  return (
    <div className="context-actions">
      {preview ? (
        <p className="context-selection-preview" title={selectionPreview ?? undefined}>
          “{preview}”
        </p>
      ) : (
        <p className="context-empty">Select text in any app, then press ⌘J.</p>
      )}
      <ul className="context-action-list">
        {CONTEXT_ACTIONS.filter((action) => action.id !== "custom").map((action) => (
          <li key={action.id}>
            <button
              type="button"
              className="context-action-btn"
              disabled={disabled || !selectionPreview}
              onClick={() => onSelect(action.id)}
            >
              <span className="context-action-label">{action.label}</span>
              <span className="context-action-desc">{action.description}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
