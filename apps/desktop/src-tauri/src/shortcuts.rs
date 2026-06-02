use std::str::FromStr;
use tauri::AppHandle;
use tauri_plugin_global_shortcut::{GlobalShortcutExt, Shortcut};

pub const FOCUS_SHORTCUT: &str = "Command+Shift+Space";

pub fn register_shortcuts(app: &AppHandle) -> Result<(), String> {
    let shortcuts = app.global_shortcut();
    let _ = shortcuts.unregister_all();
    let shortcut = Shortcut::from_str(FOCUS_SHORTCUT)
        .map_err(|error| format!("{FOCUS_SHORTCUT}: {error}"))?;
    shortcuts.register(shortcut).map_err(|error| error.to_string())
}
