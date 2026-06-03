mod commands;
mod shortcuts;
mod store;
mod window;

use commands::ollama::{
    check_ollama, ensure_ollama_running, list_ollama_models, open_ollama_app, pull_ollama_model,
    stream_ollama_chat,
};
use commands::todos::{
    add_todo, get_todos, remove_todo, reorder_todos, set_todo_due, toggle_todo, update_todo,
    TodoState,
};
use parking_lot::Mutex;
use shortcuts::register_shortcuts;
use std::sync::Arc;
use store::TodoStore;
use tauri::Manager;
use tauri_plugin_global_shortcut::ShortcutState;
use window::focus_main_window;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let data_dir = dirs::data_dir()
        .unwrap_or_else(|| std::path::PathBuf::from("."))
        .join("com.deskninja.app");
    let todo_store = Arc::new(Mutex::new(TodoStore::new(data_dir)));

    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(
            tauri_plugin_global_shortcut::Builder::new()
                .with_handler(|app, _shortcut, event| {
                    if event.state == ShortcutState::Pressed {
                        let _ = focus_main_window(app);
                    }
                })
                .build(),
        )
        .manage(TodoState {
            store: todo_store,
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
            remove_todo
        ])
        .setup(|app| {
            if let Some(quick_panel) = app.get_webview_window("quick-panel") {
                let _ = quick_panel.hide();
            }
            register_shortcuts(app.handle())?;
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running DeskNinja");
}
