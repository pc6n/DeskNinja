export function formatTokenCount(value: number): string {
  if (value < 1000) {
    return String(value);
  }
  if (value < 10_000) {
    return `${(value / 1000).toFixed(1).replace(/\.0$/, "")}k`;
  }
  if (value < 1_000_000) {
    return `${Math.round(value / 1000)}k`;
  }
  return `${(value / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
}

export function formatContextUsage(used: number, limit?: number, approximate = false): string {
  const prefix = approximate ? "~" : "";
  const usedLabel = `${prefix}${formatTokenCount(used)}`;
  if (!limit) {
    return `${usedLabel} tokens`;
  }
  return `${usedLabel} / ${formatTokenCount(limit)} tokens`;
}
