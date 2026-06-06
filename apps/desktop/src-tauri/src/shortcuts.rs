use std::str::FromStr;
use std::sync::OnceLock;
use tauri::AppHandle;
use tauri_plugin_global_shortcut::{GlobalShortcutExt, Shortcut};

/// ⌘J — chat/todo panel.
pub const DESKNINJA_SHORTCUT: &str = "Command+J";
/// ⌘⇧J — context actions on selected text.
pub const CONTEXT_ACTION_SHORTCUT: &str = "Command+Shift+J";

static PANEL_SHORTCUT: OnceLock<Shortcut> = OnceLock::new();
static CONTEXT_SHORTCUT: OnceLock<Shortcut> = OnceLock::new();

pub fn register_shortcuts(app: &AppHandle) -> Result<(), String> {
    let shortcuts = app.global_shortcut();
    let _ = shortcuts.unregister_all();

    let panel = Shortcut::from_str(DESKNINJA_SHORTCUT)
        .map_err(|error| format!("{DESKNINJA_SHORTCUT}: {error}"))?;
    shortcuts
        .register(panel.clone())
        .map_err(|error| format!("{DESKNINJA_SHORTCUT} registration failed: {error}"))?;
    let _ = PANEL_SHORTCUT.set(panel);

    let context = Shortcut::from_str(CONTEXT_ACTION_SHORTCUT)
        .map_err(|error| format!("{CONTEXT_ACTION_SHORTCUT}: {error}"))?;
    shortcuts
        .register(context.clone())
        .map_err(|error| format!("{CONTEXT_ACTION_SHORTCUT} registration failed: {error}"))?;
    let _ = CONTEXT_SHORTCUT.set(context);

    Ok(())
}

pub fn is_deskninja_shortcut(shortcut: &Shortcut) -> bool {
    PANEL_SHORTCUT
        .get()
        .is_some_and(|registered| registered == shortcut)
}

pub fn is_context_action_shortcut(shortcut: &Shortcut) -> bool {
    CONTEXT_SHORTCUT
        .get()
        .is_some_and(|registered| registered == shortcut)
}
