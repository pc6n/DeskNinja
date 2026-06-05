import { invoke } from "@tauri-apps/api/core";

export interface ForegroundAppInfo {
  name: string;
  bundleId?: string;
}

export interface SelectedTextResult {
  text: string | null;
  source: string;
}

export interface AccessibilityStatus {
  trusted: boolean;
}

export interface AppSettings {
  accessibilityPrompted: boolean;
  rightClickMenuEnabled: boolean;
  allowedPaths: string[];
}

export async function getSelectedText(): Promise<SelectedTextResult> {
  return invoke<SelectedTextResult>("get_selected_text");
}

export async function insertText(text: string): Promise<void> {
  return invoke("insert_text", { text });
}

export async function checkAccessibility(): Promise<AccessibilityStatus> {
  return invoke<AccessibilityStatus>("check_accessibility");
}

export async function requestAccessibilityPermission(): Promise<void> {
  return invoke("request_accessibility_permission");
}

export async function fetchAppSettings(): Promise<AppSettings> {
  return invoke<AppSettings>("get_app_settings");
}

export async function patchAppSettings(
  partial: Partial<AppSettings>,
): Promise<AppSettings> {
  const patch: {
    accessibilityPrompted?: boolean | null;
    rightClickMenuEnabled?: boolean | null;
    allowedPaths?: string[] | null;
  } = {};
  if (partial.accessibilityPrompted !== undefined) {
    patch.accessibilityPrompted = partial.accessibilityPrompted;
  }
  if (partial.rightClickMenuEnabled !== undefined) {
    patch.rightClickMenuEnabled = partial.rightClickMenuEnabled;
  }
  if (partial.allowedPaths !== undefined) {
    patch.allowedPaths = partial.allowedPaths;
  }
  return invoke<AppSettings>("update_app_settings", { patch });
}
