use crate::settings_store::AppSettings;
use std::path::{Component, Path, PathBuf};

const MAX_FILE_BYTES: usize = 256 * 1024;
const MAX_BATCH_FILES: usize = 20;

pub fn max_file_bytes() -> usize {
    MAX_FILE_BYTES
}

pub fn max_batch_files() -> usize {
    MAX_BATCH_FILES
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
    if let Some(rest) = path.strip_prefix("~/") {
        return dirs::home_dir()
            .unwrap_or_else(|| PathBuf::from("/"))
            .join(rest);
    }
    if path == "~" {
        return dirs::home_dir().unwrap_or_else(|| PathBuf::from("/"));
    }
    PathBuf::from(path)
}

pub fn resolve_allowed_path(path: &str, settings: &AppSettings) -> Result<PathBuf, String> {
    let expanded = expand_tilde(path);
    if expanded.components().any(|part| matches!(part, Component::ParentDir)) {
        return Err("Parent directory segments are not allowed".into());
    }

    let canonical = expanded
        .canonicalize()
        .map_err(|error| format!("Invalid path: {error}"))?;

    for root in allowed_roots(settings) {
        let root_canon = root.canonicalize().unwrap_or(root);
        if canonical.starts_with(&root_canon) {
            return Ok(canonical);
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
    !name.starts_with('.') || name == ".env" || name.ends_with(".md")
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
