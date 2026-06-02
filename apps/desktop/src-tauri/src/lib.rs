mod commands;

use commands::ollama::{
    check_ollama, ensure_ollama_running, list_ollama_models, open_ollama_app, pull_ollama_model,
    stream_ollama_chat,
};
use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![
            check_ollama,
            ensure_ollama_running,
            list_ollama_models,
            pull_ollama_model,
            stream_ollama_chat,
            open_ollama_app
        ])
        .setup(|app| {
            if let Some(quick_panel) = app.get_webview_window("quick-panel") {
                let _ = quick_panel.hide();
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running DeskNinja");
}
