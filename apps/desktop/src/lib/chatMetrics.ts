export interface MessageMetrics {
  firstTokenMs: number;
  totalMs: number;
}

export function formatDuration(ms: number): string {
  if (ms < 1) {
    return "<1ms";
  }
  if (ms < 1000) {
    return `${Math.round(ms)}ms`;
  }
  return `${(ms / 1000).toFixed(1)}s`;
}

export function buildMessageMetrics(
  startedAt: number,
  firstTokenAt: number,
  endedAt: number,
): MessageMetrics {
  const totalMs = Math.max(endedAt - startedAt, 0);
  const firstTokenMs =
    firstTokenAt > startedAt ? firstTokenAt - startedAt : totalMs;

  return {
    firstTokenMs: Math.max(firstTokenMs, 0),
    totalMs: Math.max(totalMs, firstTokenMs),
  };
}

import { preprocessAssistantContent } from "./preprocessAssistantContent";

export function formatAssistantContent(content: string): string {
  return preprocessAssistantContent(content).trim();
}

export type StreamPhase = "idle" | "thinking" | "typing";

export function getLatestAssistantMessage(
  messages: Array<{ id: string; role: string; content: string }>,
  excludeIds: ReadonlySet<string> = new Set(),
): { id: string; content: string } | undefined {
  return [...messages]
    .reverse()
    .find((message) => message.role === "assistant" && !excludeIds.has(message.id));
}

export function findActiveAssistantMessage(
  messages: Array<{ id: string; role: string; content: string }>,
  idsBeforeSend: ReadonlySet<string>,
): { id: string; content: string } | undefined {
  return messages.find(
    (message) => message.role === "assistant" && !idsBeforeSend.has(message.id),
  );
}

export function collectAssistantIds(
  messages: Array<{ id: string; role: string }>,
): Set<string> {
  return new Set(
    messages.filter((message) => message.role === "assistant").map((message) => message.id),
  );
}
