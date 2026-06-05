interface ContextResultProps {
  result: string;
  isStreaming: boolean;
  error: string | null;
  onCopy: () => void;
  onInsert: () => void;
  onRetry: () => void;
  onBack: () => void;
}

export function ContextResult({
  result,
  isStreaming,
  error,
  onCopy,
  onInsert,
  onRetry,
  onBack,
}: ContextResultProps) {
  return (
    <div className="context-result">
      <button type="button" className="context-back" onClick={onBack}>
        ← Actions
      </button>
      {error ? <p className="context-error">{error}</p> : null}
      <div className="context-result-body" aria-live="polite">
        {result || (isStreaming ? "Thinking…" : "")}
      </div>
      <div className="context-result-actions">
        <button type="button" disabled={!result || isStreaming} onClick={onCopy}>
          Copy
        </button>
        <button type="button" disabled={!result || isStreaming} onClick={onInsert}>
          Insert
        </button>
        <button type="button" className="secondary" disabled={isStreaming} onClick={onRetry}>
          Retry
        </button>
      </div>
    </div>
  );
}
