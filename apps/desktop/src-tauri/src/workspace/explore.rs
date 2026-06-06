use super::sandbox::resolve_allowed_path;
use crate::settings_store::AppSettings;
use std::fs;
use std::path::Path;

const MAX_EXPLORE_FILES: usize = 80;
const MAX_EXPLORE_DEPTH: usize = 6;

const SKIP_DIR_NAMES: &[&str] = &[
    "node_modules",
    "target",
    "dist",
    ".git",
    "gen",
    "coverage",
    ".turbo",
    "build",
    ".next",
    "vendor",
];

const SOURCE_EXTENSIONS: &[&str] = &[
    "rs", "ts", "tsx", "js", "jsx", "css", "md", "json", "toml", "yaml", "yml", "html",
];

pub struct ExploreRepoResult {
    pub root: String,
    pub files: Vec<String>,
    pub truncated: bool,
}

pub fn explore_repo(path: &str, settings: &AppSettings) -> Result<ExploreRepoResult, String> {
    let root = resolve_allowed_path(path, settings)?;
    if !root.is_dir() {
        return Err("Path is not a directory".into());
    }

    let mut files = Vec::new();
    collect_files(&root, &root, 0, &mut files)?;
    let truncated = files.len() > MAX_EXPLORE_FILES;
    if truncated {
        files.truncate(MAX_EXPLORE_FILES);
    }
    files.sort();

    Ok(ExploreRepoResult {
        root: root.to_string_lossy().to_string(),
        files,
        truncated,
    })
}

fn collect_files(root: &Path, current: &Path, depth: usize, files: &mut Vec<String>) -> Result<(), String> {
    if depth > MAX_EXPLORE_DEPTH {
        return Ok(());
    }

    for entry in fs::read_dir(current).map_err(|error| error.to_string())? {
        let entry = entry.map_err(|error| error.to_string())?;
        let path = entry.path();
        let name = entry.file_name().to_string_lossy().to_string();

        if entry.file_type().map_err(|error| error.to_string())?.is_dir() {
            if should_skip_dir(&name) {
                continue;
            }
            collect_files(root, &path, depth + 1, files)?;
            continue;
        }

        if is_source_file(&path) {
            files.push(path.to_string_lossy().to_string());
        }
    }
    Ok(())
}

fn should_skip_dir(name: &str) -> bool {
    SKIP_DIR_NAMES.contains(&name) || name.starts_with('.') && name != ".github"
}

fn is_source_file(path: &Path) -> bool {
    let Some(ext) = path.extension().and_then(|value| value.to_str()) else {
        return false;
    };
    SOURCE_EXTENSIONS.contains(&ext)
}
