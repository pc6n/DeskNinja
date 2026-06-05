use crate::paste::{simulate_copy, simulate_paste};
use crate::settings_store::{AppSettings, AppSettingsPatch, SettingsStore};
use parking_lot::Mutex;
use serde::Serialize;
use std::process::Command;
use std::sync::Arc;
use std::thread;
use std::time::Duration;
use tauri::{AppHandle, State};
use tauri_plugin_clipboard_manager::ClipboardExt;

pub struct MacOsState {
    pub settings: Arc<Mutex<SettingsStore>>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ForegroundAppInfo {
    pub name: String,
    pub bundle_id: Option<String>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SelectedTextResult {
    pub text: Option<String>,
    pub source: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AccessibilityStatus {
    pub trusted: bool,
}

#[tauri::command]
pub fn get_foreground_app() -> Result<ForegroundAppInfo, String> {
    Ok(read_foreground_app()?)
}

#[tauri::command]
pub fn get_selected_text(app: AppHandle) -> Result<SelectedTextResult, String> {
    let text = capture_selection_for_menu(&app)?;
    Ok(SelectedTextResult {
        text,
        source: "clipboard".into(),
    })
}

#[tauri::command]
pub fn insert_text(app: AppHandle, text: String) -> Result<(), String> {
    write_clipboard(&app, &text)?;
    simulate_paste()
}

#[tauri::command]
pub fn check_accessibility() -> Result<AccessibilityStatus, String> {
    Ok(AccessibilityStatus {
        trusted: is_accessibility_trusted(),
    })
}

#[tauri::command]
pub fn request_accessibility_permission() -> Result<(), String> {
    Command::new("open")
        .arg("x-apple.systempreferences:com.apple.preference.security?Privacy_Accessibility")
        .spawn()
        .map_err(|error| error.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn get_app_settings(state: State<'_, MacOsState>) -> Result<AppSettings, String> {
    Ok(state.settings.lock().get().clone())
}

#[tauri::command]
pub fn update_app_settings(
    state: State<'_, MacOsState>,
    patch: AppSettingsPatch,
) -> Result<AppSettings, String> {
    Ok(state.settings.lock().update(patch))
}

fn read_clipboard(app: &AppHandle) -> Result<Option<String>, String> {
    match app.clipboard().read_text() {
        Ok(text) => Ok(Some(text)),
        Err(_) => Ok(None),
    }
}

fn write_clipboard(app: &AppHandle, text: &str) -> Result<(), String> {
    app.clipboard()
        .write_text(text.to_string())
        .map_err(|error| error.to_string())
}

pub fn capture_selection_for_menu(app: &AppHandle) -> Result<Option<String>, String> {
    let saved = read_clipboard(app)?;
    simulate_copy()?;
    thread::sleep(Duration::from_millis(90));
    let captured = read_clipboard(app)?;
    if let Some(saved_text) = saved {
        let _ = write_clipboard(&app, &saved_text);
    }
    Ok(captured.filter(|value| !value.trim().is_empty()))
}

fn is_accessibility_trusted() -> bool {
    Command::new("osascript")
        .args(["-e", "tell application \"System Events\" to return 1"])
        .output()
        .map(|output| output.status.success())
        .unwrap_or(false)
}

fn read_foreground_app() -> Result<ForegroundAppInfo, String> {
    let output = Command::new("osascript")
        .args([
            "-e",
            "tell application \"System Events\" to get name of first application process whose frontmost is true",
        ])
        .output()
        .map_err(|error| error.to_string())?;
    if !output.status.success() {
        return Err("Could not read foreground app.".into());
    }
    let name = String::from_utf8_lossy(&output.stdout).trim().to_string();
    Ok(ForegroundAppInfo {
        name,
        bundle_id: None,
    })
}
