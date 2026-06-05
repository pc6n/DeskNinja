use crate::workspace::readonly_cmd::run_readonly;
use crate::workspace::sandbox::{
    is_text_file, matches_glob, max_batch_files, max_file_bytes, resolve_allowed_path,
};
use parking_lot::Mutex;
use serde::Serialize;
use std::fs;
use std::sync::Arc;
use tauri::State;

pub struct WorkspaceState {
    pub settings: Arc<Mutex<crate::settings_store::SettingsStore>>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct WorkspaceFileContent {
    pub path: String,
    pub content: String,
    pub truncated: bool,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct WorkspaceDirEntry {
    pub name: String,
    pub path: String,
    pub is_dir: bool,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ReadonlyCommandResult {
    pub output: String,
}

#[tauri::command]
pub fn read_workspace_file(
    state: State<'_, WorkspaceState>,
    path: String,
) -> Result<WorkspaceFileContent, String> {
    let settings = state.settings.lock().get().clone();
    let resolved = resolve_allowed_path(&path, &settings)?;
    read_file_at(&resolved)
}

#[tauri::command]
pub fn read_workspace_files(
    state: State<'_, WorkspaceState>,
    paths: Vec<String>,
) -> Result<Vec<WorkspaceFileContent>, String> {
    if paths.len() > max_batch_files() {
        return Err(format!("Too many files (max {})", max_batch_files()));
    }
    let settings = state.settings.lock().get().clone();
    paths
        .iter()
        .map(|path| {
            let resolved = resolve_allowed_path(path, &settings)?;
            read_file_at(&resolved)
        })
        .collect()
}

#[tauri::command]
pub fn list_workspace_dir(
    state: State<'_, WorkspaceState>,
    path: String,
    glob: Option<String>,
) -> Result<Vec<WorkspaceDirEntry>, String> {
    let settings = state.settings.lock().get().clone();
    let resolved = resolve_allowed_path(&path, &settings)?;
    if !resolved.is_dir() {
        return Err("Path is not a directory".into());
    }

    let pattern = glob.unwrap_or_else(|| "*".to_string());
    let mut entries = Vec::new();
    for entry in fs::read_dir(&resolved).map_err(|error| error.to_string())? {
        let entry = entry.map_err(|error| error.to_string())?;
        let name = entry.file_name().to_string_lossy().to_string();
        if !matches_glob(&name, &pattern) {
            continue;
        }
        let entry_path = entry.path();
        entries.push(WorkspaceDirEntry {
            path: entry_path.to_string_lossy().to_string(),
            is_dir: entry_path.is_dir(),
            name,
        });
    }
    entries.sort_by(|left, right| left.name.cmp(&right.name));
    Ok(entries)
}

#[tauri::command]
pub fn run_readonly_command(
    state: State<'_, WorkspaceState>,
    cmd: String,
    args: Vec<String>,
) -> Result<ReadonlyCommandResult, String> {
    let settings = state.settings.lock().get().clone();
    let output = run_readonly(&cmd, &args, &settings)?;
    Ok(ReadonlyCommandResult { output })
}

fn read_file_at(path: &std::path::Path) -> Result<WorkspaceFileContent, String> {
    if !path.is_file() {
        return Err("Path is not a file".into());
    }
    let bytes = fs::read(path).map_err(|error| error.to_string())?;
    if !is_text_file(path, &bytes[..bytes.len().min(8192)]) {
        return Err("Only text files can be read".into());
    }
    let truncated = bytes.len() > max_file_bytes();
    let content_bytes = if truncated {
        &bytes[..max_file_bytes()]
    } else {
        &bytes
    };
    let mut content = String::from_utf8_lossy(content_bytes).to_string();
    if truncated {
        content.push_str("\n\n[truncated]");
    }
    Ok(WorkspaceFileContent {
        path: path.to_string_lossy().to_string(),
        content,
        truncated,
    })
}
