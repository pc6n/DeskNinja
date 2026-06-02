import type { MessageMetrics, StreamPhase } from "../lib/chatMetrics";
import { formatDuration } from "../lib/chatMetrics";

interface MessageMetricsFooterProps {
  metrics?: MessageMetrics;
}

export function MessageMetricsFooter({ metrics }: MessageMetricsFooterProps) {
  if (!metrics) {
    return null;
  }

  const showTotal = metrics.totalMs - metrics.firstTokenMs > 250;

  return (
    <footer className="message-metrics">
      Time to first token {formatDuration(metrics.firstTokenMs)}
      {showTotal ? <> · Generated in {formatDuration(metrics.totalMs)}</> : null}
    </footer>
  );
}

interface ThinkingIndicatorProps {
  visible: boolean;
}

export function ThinkingIndicator({ visible }: ThinkingIndicatorProps) {
  if (!visible) {
    return null;
  }

  return (
    <article className="message message-assistant message-pending" aria-live="polite">
      <header>assistant</header>
      <p className="thinking-indicator">
        Thinking
        <span className="thinking-dots" aria-hidden="true">
          <span>.</span>
          <span>.</span>
          <span>.</span>
        </span>
      </p>
    </article>
  );
}

interface TypingCursorProps {
  visible: boolean;
}

export function TypingCursor({ visible }: TypingCursorProps) {
  if (!visible) {
    return null;
  }

  return <span className="typing-cursor" aria-hidden="true" />;
}

export { formatAssistantContent } from "../lib/chatMetrics";

export function getStreamUiState(
  isStreaming: boolean,
  streamPhase: StreamPhase,
  assistantContent?: string,
): { showThinking: boolean; showTypingCursor: boolean } {
  const showThinking = isStreaming && streamPhase === "thinking" && !assistantContent;
  const showTypingCursor = isStreaming && streamPhase === "typing" && Boolean(assistantContent);

  return { showThinking, showTypingCursor };
}
