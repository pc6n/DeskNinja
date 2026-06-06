use crate::settings_store::AppSettings;
use std::path::{Component, Path, PathBuf};

const MAX_FILE_BYTES: usize = 256 * 1024;
const MAX_BATCH_FILES: usize = 20;
const MAX_DIR_ENTRIES: usize = 200;

pub fn max_file_bytes() -> usize {
    MAX_FILE_BYTES
}

pub fn max_batch_files() -> usize {
    MAX_BATCH_FILES
}

pub fn max_dir_entries() -> usize {
    MAX_DIR_ENTRIES
}

pub fn allowed_roots(settings: &AppSettings) -> Vec<PathBuf> {
    let mut roots = Vec::new();
    if let Some(home) = dirs::home_dir() {
        roots.push(home);
    }
    for path in &settings.allowed_paths {
        if !path.trim().is_empty() {
            roots.push(PathBuf::from(path));
        }
    }
    roots
}

pub fn expand_tilde(path: &str) -> PathBuf {
    let home = dirs::home_dir().unwrap_or_else(|| PathBuf::from("/"));
    if let Some(rest) = path.strip_prefix("~/") {
        return home.join(rest);
    }
    if path == "~" {
        return home;
    }
    if let Some(rest) = path.strip_prefix('~') {
        if !rest.is_empty() && !rest.starts_with('/') {
            return home.join(rest);
        }
    }
    PathBuf::from(path)
}

pub fn resolve_allowed_path(path: &str, settings: &AppSettings) -> Result<PathBuf, String> {
    let expanded = expand_tilde(path);
    if expanded.components().any(|part| matches!(part, Component::ParentDir)) {
        return Err("Parent directory segments are not allowed".into());
    }

    if expanded.is_relative() {
        return resolve_relative_in_roots(&expanded, settings);
    }

    let canonical = expanded
        .canonicalize()
        .map_err(|error| format!("Invalid path: {error}"))?;
    ensure_under_allowed_root(&canonical, settings)
}

fn resolve_relative_in_roots(relative: &Path, settings: &AppSettings) -> Result<PathBuf, String> {
    let mut last_error = String::from("Path not found under allowed folders");
    for root in allowed_roots(settings) {
        let candidate = root.join(relative);
        let Ok(canon) = candidate.canonicalize() else {
            continue;
        };
        match ensure_under_allowed_root(&canon, settings) {
            Ok(path) => return Ok(path),
            Err(error) => last_error = error,
        }
    }
    Err(last_error)
}

fn ensure_under_allowed_root(canonical: &Path, settings: &AppSettings) -> Result<PathBuf, String> {
    for root in allowed_roots(settings) {
        let root_canon = root.canonicalize().unwrap_or(root);
        if canonical.starts_with(&root_canon) {
            return Ok(canonical.to_path_buf());
        }
    }
    Err("Path is outside allowed workspace folders".into())
}

pub fn is_text_file(path: &Path, sample: &[u8]) -> bool {
    if sample.contains(&0) {
        return false;
    }
    let Some(name) = path.file_name().and_then(|value| value.to_str()) else {
        return false;
    };
    if !name.starts_with('.') {
        return true;
    }
    matches!(
        name,
        ".env" | ".gitignore" | ".editorconfig" | ".npmrc" | ".prettierrc"
    ) || name.ends_with(".md") || name.ends_with(".json") || name.ends_with(".yaml")
        || name.ends_with(".yml") || name.ends_with(".toml")
}

pub fn matches_glob(name: &str, pattern: &str) -> bool {
    if let Some(suffix) = pattern.strip_prefix('*') {
        return name.ends_with(suffix);
    }
    if let Some(prefix) = pattern.strip_suffix('*') {
        return name.starts_with(prefix);
    }
    name == pattern
}
