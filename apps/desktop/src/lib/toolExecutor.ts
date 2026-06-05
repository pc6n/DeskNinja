import { invoke } from "@tauri-apps/api/core";
import type { ToolCallRequest, ToolCallResult, ToolExecutor } from "@deskninja/ai-core";

interface WorkspaceFileContent {
  path: string;
  content: string;
  truncated: boolean;
}

interface WorkspaceDirEntry {
  name: string;
  path: string;
  isDir: boolean;
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
  switch (request.tool) {
    case "read_file": {
      const path = readString(request.input.path, "path");
      const file = await invoke<WorkspaceFileContent>("read_workspace_file", { path });
      return { path: file.path, content: file.content, truncated: file.truncated };
    }
    case "read_files": {
      const paths = readStringArray(request.input.paths, "paths");
      const files = await invoke<WorkspaceFileContent[]>("read_workspace_files", { paths });
      return { files };
    }
    case "list_dir": {
      const path = readString(request.input.path, "path");
      const glob = typeof request.input.glob === "string" ? request.input.glob : undefined;
      const entries = await invoke<WorkspaceDirEntry[]>("list_workspace_dir", { path, glob });
      return { entries };
    }
    case "run_readonly_cmd": {
      const cmd = readString(request.input.cmd, "cmd");
      const args = readStringArray(request.input.args, "args");
      const result = await invoke<ReadonlyCommandResult>("run_readonly_command", { cmd, args });
      return { output: result.output };
    }
    default:
      throw new Error(`Unsupported tool: ${request.tool}`);
  }
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
