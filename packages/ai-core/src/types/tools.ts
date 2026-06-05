export type ToolName =
  | "clipboard_read"
  | "clipboard_write"
  | "screenshot"
  | "insert_text"
  | "read_file"
  | "read_files"
  | "list_dir"
  | "run_readonly_cmd";

export interface ToolPermission {
  tool: ToolName;
  granted: boolean;
  grantedAt?: Date;
}

export interface ToolCallRequest {
  id: string;
  tool: ToolName;
  input: Record<string, unknown>;
}

export interface ToolCallResult {
  id: string;
  tool: ToolName;
  output: Record<string, unknown>;
  success: boolean;
  errorMessage?: string;
}

export interface ToolExecutor {
  execute(request: ToolCallRequest): Promise<ToolCallResult>;
}

export interface ToolActivity {
  tool: ToolName;
  label: string;
  status: "running" | "done" | "error";
}
