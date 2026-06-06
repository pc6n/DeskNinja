import type { ChatToolCall } from "../types/chat.js";
import type { ToolName } from "../types/tools.js";

const TOOL_NAMES = new Set<ToolName>([
  "read_file",
  "read_files",
  "list_dir",
  "explore_repo",
  "run_readonly_cmd",
]);

export function parseTextToolCalls(content: string): ChatToolCall[] {
  const trimmed = stripCodeFences(content.trim());
  if (!trimmed) {
    return [];
  }

  const calls: ChatToolCall[] = [];
  for (const candidate of extractJsonCandidates(trimmed)) {
    const parsed = parseToolCandidate(candidate);
    if (parsed) {
      calls.push(parsed);
    }
  }
  return dedupeToolCalls(calls);
}

function stripCodeFences(content: string): string {
  const fenced = content.match(/^```(?:json)?\s*([\s\S]*?)```$/i);
  return fenced?.[1]?.trim() ?? content;
}

function extractJsonCandidates(content: string): string[] {
  const candidates = [normalizeLooseJson(content)];
  const objectPattern = /\{[\s\S]*?\}/g;
  let match = objectPattern.exec(content);
  while (match) {
    candidates.push(normalizeLooseJson(match[0]));
    match = objectPattern.exec(content);
  }
  return candidates;
}

function normalizeLooseJson(raw: string): string {
  return raw.replace(/'([^'\\]*(?:\\.[^'\\]*)*)'/g, (_, inner: string) => {
    const escaped = inner.replace(/"/g, '\\"');
    return `"${escaped}"`;
  });
}

function parseToolCandidate(raw: string): ChatToolCall | null {
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    return null;
  }
  return parseToolObject(value);
}

function parseToolObject(value: unknown): ChatToolCall | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const record = value as Record<string, unknown>;
  const nested = record.function;
  if (nested && typeof nested === "object") {
    return parseToolObject({
      name: (nested as Record<string, unknown>).name,
      arguments: (nested as Record<string, unknown>).arguments,
      parameters: (nested as Record<string, unknown>).parameters,
      id: record.id,
    });
  }

  const name = typeof record.name === "string" ? record.name : undefined;
  if (!name || !TOOL_NAMES.has(name as ToolName)) {
    return null;
  }

  const args = readToolArguments(record);
  if (!args) {
    return null;
  }

  return {
    id: typeof record.id === "string" ? record.id : crypto.randomUUID(),
    name,
    arguments: args,
  };
}

function readToolArguments(record: Record<string, unknown>): Record<string, unknown> | null {
  const candidate = record.arguments ?? record.parameters;
  if (!candidate || typeof candidate !== "object" || Array.isArray(candidate)) {
    return null;
  }
  return candidate as Record<string, unknown>;
}

function dedupeToolCalls(calls: ChatToolCall[]): ChatToolCall[] {
  const seen = new Set<string>();
  return calls.filter((call) => {
    const key = `${call.name}:${JSON.stringify(call.arguments)}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}
