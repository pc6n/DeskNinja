use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AppSettings {
    #[serde(default)]
    pub accessibility_prompted: bool,
    #[serde(default)]
    pub right_click_menu_enabled: bool,
    #[serde(default)]
    pub allowed_paths: Vec<String>,
}

impl Default for AppSettings {
    fn default() -> Self {
        Self {
            accessibility_prompted: false,
            right_click_menu_enabled: false,
            allowed_paths: Vec::new(),
        }
    }
}

pub struct SettingsStore {
    settings: AppSettings,
    path: PathBuf,
}

impl SettingsStore {
    pub fn new(data_dir: PathBuf) -> Self {
        let path = data_dir.join("settings.json");
        let settings = fs::read_to_string(&path)
            .ok()
            .and_then(|raw| serde_json::from_str(&raw).ok())
            .unwrap_or_default();
        Self { settings, path }
    }

    pub fn get(&self) -> &AppSettings {
        &self.settings
    }

    pub fn update(&mut self, partial: AppSettingsPatch) -> AppSettings {
        if let Some(value) = partial.accessibility_prompted {
            self.settings.accessibility_prompted = value;
        }
        if let Some(value) = partial.right_click_menu_enabled {
            self.settings.right_click_menu_enabled = value;
        }
        if let Some(value) = partial.allowed_paths {
            self.settings.allowed_paths = value;
        }
        self.persist();
        self.settings.clone()
    }

    fn persist(&self) {
        if let Some(parent) = self.path.parent() {
            let _ = fs::create_dir_all(parent);
        }
        if let Ok(raw) = serde_json::to_string_pretty(&self.settings) {
            let _ = fs::write(&self.path, raw);
        }
    }
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AppSettingsPatch {
    #[serde(default)]
    pub accessibility_prompted: Option<bool>,
    #[serde(default)]
    pub right_click_menu_enabled: Option<bool>,
    #[serde(default)]
    pub allowed_paths: Option<Vec<String>>,
}
