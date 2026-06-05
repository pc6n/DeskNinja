use serde::Serialize;
use tauri::AppHandle;

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AppInfo {
    pub name: String,
    pub version: String,
    pub shortcut_label: String,
}

#[tauri::command]
pub fn get_app_info(app: AppHandle) -> AppInfo {
    let pkg = app.package_info();
    AppInfo {
        name: app
            .config()
            .product_name
            .clone()
            .unwrap_or_else(|| "DeskNinja".into()),
        version: pkg.version.to_string(),
        shortcut_label: "⌘J".into(),
    }
}

#[tauri::command]
pub fn show_about(app: AppHandle) -> Result<(), String> {
    crate::window::show_about_window(&app)
}
