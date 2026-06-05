use std::str::FromStr;
use std::sync::OnceLock;
use tauri::AppHandle;
use tauri_plugin_global_shortcut::{GlobalShortcutExt, Shortcut};

/// ⌘J — panel, or context menu when text is selected.
pub const DESKNINJA_SHORTCUT: &str = "Command+J";

static REGISTERED: OnceLock<Shortcut> = OnceLock::new();

pub fn register_shortcuts(app: &AppHandle) -> Result<(), String> {
    let shortcuts = app.global_shortcut();
    let _ = shortcuts.unregister_all();
    let shortcut = Shortcut::from_str(DESKNINJA_SHORTCUT)
        .map_err(|error| format!("{DESKNINJA_SHORTCUT}: {error}"))?;
    shortcuts
        .register(shortcut.clone())
        .map_err(|error| format!("{DESKNINJA_SHORTCUT} registration failed: {error}"))?;
    let _ = REGISTERED.set(shortcut);
    Ok(())
}

pub fn is_deskninja_shortcut(shortcut: &Shortcut) -> bool {
    REGISTERED
        .get()
        .is_some_and(|registered| registered == shortcut)
}
