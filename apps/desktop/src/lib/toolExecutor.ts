import { invoke } from "@tauri-apps/api/core";
import type { ToolCallRequest, ToolCallResult, ToolExecutor } from "@deskninja/ai-core";

interface WorkspaceFileContent {
  path: string;
  content?: string;
  truncated?: boolean;
  error?: string;
}

interface WorkspaceDirEntry {
  name: string;
  path: string;
  isDir: boolean;
}

interface WorkspaceDirListing {
  entries: WorkspaceDirEntry[];
  truncated: boolean;
}

interface ExploreRepoResult {
  root: string;
  files: string[];
  truncated: boolean;
}

interface ReadonlyCommandResult {
  output: string;
}

export function createDesktopToolExecutor(): ToolExecutor {
  return {
    execute: executeToolCall,
  };
}

async function executeToolCall(request: ToolCallRequest): Promise<ToolCallResult> {
  try {
    const output = await dispatchTool(request);
    return {
      id: request.id,
      tool: request.tool,
      output,
      success: true,
    };
  } catch (error) {
    return {
      id: request.id,
      tool: request.tool,
      output: {},
      success: false,
      errorMessage: error instanceof Error ? error.message : String(error),
    };
  }
}

async function dispatchTool(request: ToolCallRequest): Promise<Record<string, unknown>> {
  const input = normalizeToolInput(request.input);
  switch (request.tool) {
    case "read_file": {
      const path = readString(input.path, "path");
      const file = await invoke<WorkspaceFileContent>("read_workspace_file", { path });
      return {
        path: file.path,
        content: file.content,
        truncated: file.truncated ?? false,
        error: file.error,
      };
    }
    case "read_files": {
      const paths = readStringArray(input.paths, "paths");
      const files = await invoke<WorkspaceFileContent[]>("read_workspace_files", { paths });
      return { files };
    }
    case "explore_repo": {
      const path = readString(input.path, "path");
      const result = await invoke<ExploreRepoResult>("explore_workspace_repo", { path });
      return { root: result.root, files: result.files, truncated: result.truncated };
    }
    case "list_dir": {
      const path = readString(input.path, "path");
      const glob = typeof input.glob === "string" ? input.glob : undefined;
      const listing = await invoke<WorkspaceDirListing>("list_workspace_dir", { path, glob });
      return { entries: listing.entries, truncated: listing.truncated };
    }
    case "run_readonly_cmd": {
      const cmd = readString(input.cmd, "cmd");
      const args = readStringArray(input.args, "args");
      const result = await invoke<ReadonlyCommandResult>("run_readonly_command", { cmd, args });
      return { output: result.output };
    }
    default:
      throw new Error(`Unsupported tool: ${request.tool}`);
  }
}

function normalizeToolInput(input: Record<string, unknown>): Record<string, unknown> {
  const next = { ...input };
  if (typeof next.path === "string") {
    next.path = normalizeTildePath(next.path);
  }
  if (Array.isArray(next.paths)) {
    next.paths = next.paths.map((value) =>
      typeof value === "string" ? normalizeTildePath(value) : value,
    );
  }
  return next;
}

function normalizeTildePath(path: string): string {
  if (path.startsWith("~") && path !== "~" && !path.startsWith("~/")) {
    return `~/${path.slice(1)}`;
  }
  return path;
}

function readString(value: unknown, field: string): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`Missing ${field}`);
  }
  return value;
}

function readStringArray(value: unknown, field: string): string[] {
  if (!Array.isArray(value) || value.some((item) => typeof item !== "string")) {
    throw new Error(`Missing ${field}`);
  }
  return value;
}
