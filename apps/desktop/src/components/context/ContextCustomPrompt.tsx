interface ContextCustomPromptProps {
  draft: string;
  disabled: boolean;
  onDraftChange: (value: string) => void;
  onRun: () => void;
  onBack: () => void;
}

export function ContextCustomPrompt({
  draft,
  disabled,
  onDraftChange,
  onRun,
  onBack,
}: ContextCustomPromptProps) {
  return (
    <div className="context-custom">
      <button type="button" className="context-back" onClick={onBack}>
        ← Actions
      </button>
      <label className="sr-only" htmlFor="context-custom-input">
        Custom prompt
      </label>
      <textarea
        id="context-custom-input"
        value={draft}
        onChange={(event) => onDraftChange(event.target.value)}
        placeholder="What should DeskNinja do with the selection?"
        rows={3}
        disabled={disabled}
      />
      <button type="button" disabled={disabled || draft.trim().length === 0} onClick={onRun}>
        Run
      </button>
    </div>
  );
}
