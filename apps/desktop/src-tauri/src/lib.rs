mod commands;
mod paste;
mod settings_store;
mod shortcuts;
mod store;
mod tray;
mod window;

use commands::app_info::{get_app_info, show_about};
use commands::macos::{
    check_accessibility, get_app_settings, get_foreground_app, get_selected_text, insert_text,
    request_accessibility_permission, update_app_settings, MacOsState,
};
use commands::ollama::{
    check_ollama, ensure_ollama_running, list_ollama_models, open_ollama_app, pull_ollama_model,
    stream_ollama_chat,
};
use commands::todos::{
    add_todo, get_todos, remove_todo, reorder_todos, set_todo_due, toggle_todo, update_todo,
    TodoState,
};
use parking_lot::Mutex;
use shortcuts::{is_deskninja_shortcut, register_shortcuts};
use std::sync::Arc;
use store::TodoStore;
use settings_store::SettingsStore;
use tauri::{Manager, RunEvent};
use tauri_plugin_global_shortcut::ShortcutState;
use window::{
    configure_popup_window, hide_window, toggle_deskninja_at_cursor, toggle_panel_at_cursor,
    ACTION_MENU_LABEL, PANEL_LABEL,
};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let data_dir = dirs::data_dir()
        .unwrap_or_else(|| std::path::PathBuf::from("."))
        .join("com.deskninja.app");
    let todo_store = Arc::new(Mutex::new(TodoStore::new(data_dir.clone())));
    let settings_store = Arc::new(Mutex::new(SettingsStore::new(data_dir)));

    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(
            tauri_plugin_global_shortcut::Builder::new()
                .with_handler(|app, shortcut, event| {
                    if event.state != ShortcutState::Pressed {
                        return;
                    }
                    if is_deskninja_shortcut(shortcut) {
                        let _ = toggle_deskninja_at_cursor(app);
                    }
                })
                .build(),
        )
        .manage(TodoState {
            store: todo_store,
        })
        .manage(MacOsState {
            settings: settings_store.clone(),
        })
        .invoke_handler(tauri::generate_handler![
            check_ollama,
            ensure_ollama_running,
            list_ollama_models,
            pull_ollama_model,
            stream_ollama_chat,
            open_ollama_app,
            get_todos,
            add_todo,
            toggle_todo,
            update_todo,
            set_todo_due,
            reorder_todos,
            remove_todo,
            get_foreground_app,
            get_selected_text,
            insert_text,
            check_accessibility,
            request_accessibility_permission,
            get_app_settings,
            update_app_settings,
            get_app_info,
            show_about
        ])
        .setup(move |app| {
            if let Some(main) = app.get_webview_window("main") {
                let _ = main.hide();
            }
            for label in [PANEL_LABEL, ACTION_MENU_LABEL] {
                if let Some(window) = app.get_webview_window(label) {
                    let _ = window.hide();
                }
                configure_popup_window(app.handle(), label)?;
            }
            register_shortcuts(app.handle())?;
            if let Some(about) = app.get_webview_window(window::ABOUT_LABEL) {
                let _ = about.hide();
            }
            tray::setup_tray(app)?;
            Ok(())
        })
        .build(tauri::generate_context!())
        .expect("error building DeskNinja")
        .run(|app, event| {
            match event {
                RunEvent::ExitRequested { api, code, .. } => {
                    // Keep running in the menu bar when the user dismisses windows (code None).
                    // Allow tray Quit / app.exit() which passes code Some(...).
                    if code.is_none() {
                        api.prevent_exit();
                    }
                }
                RunEvent::Reopen { .. } => {
                    let _ = toggle_panel_at_cursor(app);
                }
                RunEvent::WindowEvent {
                    label,
                    event: tauri::WindowEvent::Focused(false),
                    ..
                } if label == PANEL_LABEL || label == ACTION_MENU_LABEL => {
                    if window::should_ignore_focus_lost(&label) {
                        return;
                    }
                    let _ = hide_window(app, &label);
                }
                _ => {}
            }
        });
}
