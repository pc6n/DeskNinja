export type ToolName = "clipboard_read" | "clipboard_write" | "screenshot" | "insert_text";

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
