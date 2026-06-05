import type { ToolName, ToolPermission } from "@deskninja/ai-core";

export interface ForegroundAppInfo {
  name: string;
  bundleId?: string;
}

export interface ClipboardSnapshot {
  text: string;
  capturedAt: Date;
}

export interface AppSettings {
  accessibilityPrompted: boolean;
  rightClickMenuEnabled: boolean;
}

export interface MacOsBridge {
  getForegroundApp(): Promise<ForegroundAppInfo | null>;
  readClipboard(): Promise<ClipboardSnapshot | null>;
  writeClipboard(text: string): Promise<void>;
  getSelectedText(): Promise<string | null>;
  insertText(text: string): Promise<void>;
  getPermissions(): Promise<ToolPermission[]>;
  requestPermission(tool: ToolName): Promise<ToolPermission>;
}

export class UnsupportedMacOsBridge implements MacOsBridge {
  async getForegroundApp(): Promise<ForegroundAppInfo | null> {
    return null;
  }

  async readClipboard(): Promise<ClipboardSnapshot | null> {
    return null;
  }

  async writeClipboard(_text: string): Promise<void> {
    throw new Error("Clipboard write is not available outside the desktop shell.");
  }

  async getSelectedText(): Promise<string | null> {
    return null;
  }

  async insertText(_text: string): Promise<void> {
    throw new Error("Insert text is not available outside the desktop shell.");
  }

  async getPermissions(): Promise<ToolPermission[]> {
    return [];
  }

  async requestPermission(tool: ToolName): Promise<ToolPermission> {
    return { tool, granted: false };
  }
}

export function createMacOsBridge(): MacOsBridge {
  return new UnsupportedMacOsBridge();
}
