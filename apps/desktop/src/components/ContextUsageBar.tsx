import type { TokenUsage } from "@deskninja/ai-core";
import { formatContextUsage, formatTokenCount } from "../lib/formatTokens";

interface ContextUsageBarProps {
  usage?: TokenUsage;
  contextLimit?: number;
  approximate?: boolean;
  lastReplyTokens?: number;
}

export function ContextUsageBar({
  usage,
  contextLimit,
  approximate = false,
  lastReplyTokens,
}: ContextUsageBarProps) {
  if (!usage) {
    return null;
  }

  const percent = contextLimit ? Math.min((usage.totalTokens / contextLimit) * 100, 100) : 0;

  return (
    <div className="context-usage-bar" aria-label="Context token usage">
      <div className="context-usage-label">
        Chat context {formatContextUsage(usage.totalTokens, contextLimit, approximate)}
        {lastReplyTokens ? ` · last reply ${formatTokenCount(lastReplyTokens)}` : null}
      </div>
      {contextLimit ? (
        <div className="context-usage-track" aria-hidden="true">
          <span className="context-usage-fill" style={{ width: `${percent}%` }} />
        </div>
      ) : null}
    </div>
  );
}
