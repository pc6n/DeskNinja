use super::sandbox::resolve_allowed_path;
use crate::settings_store::AppSettings;
use std::process::{Command, Stdio};
use std::sync::mpsc;
use std::time::Duration;

const ALLOWED_COMMANDS: &[&str] = &["ls", "find", "head", "tail", "wc", "cat"];
const COMMAND_TIMEOUT_SECS: u64 = 5;

pub fn run_readonly(cmd: &str, args: &[String], settings: &AppSettings) -> Result<String, String> {
    if !ALLOWED_COMMANDS.contains(&cmd) {
        return Err(format!("Command not allowed: {cmd}"));
    }
    if args.iter().any(|arg| arg.contains(['|', ';', '&', '>', '<', '`', '$'])) {
        return Err("Shell operators are not allowed".into());
    }

    let validated = validate_args(cmd, args, settings)?;
    let output = run_with_timeout(cmd, &validated)?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr).trim().to_string();
        return Err(if stderr.is_empty() {
            format!("Command failed: {cmd}")
        } else {
            stderr
        });
    }

    Ok(String::from_utf8_lossy(&output.stdout).to_string())
}

fn validate_args(cmd: &str, args: &[String], settings: &AppSettings) -> Result<Vec<String>, String> {
    let mut validated = Vec::new();
    for arg in args {
        validated.push(resolve_arg_path(cmd, arg, settings)?);
    }
    Ok(validated)
}

fn resolve_arg_path(cmd: &str, arg: &str, settings: &AppSettings) -> Result<String, String> {
    if arg.starts_with('-') || !looks_like_path(arg) {
        return Ok(arg.to_string());
    }
    let resolved = resolve_allowed_path(arg, settings)?;
    if cmd == "find" {
        return Ok(resolved.to_string_lossy().to_string());
    }
    Ok(resolved.to_string_lossy().to_string())
}

fn looks_like_path(arg: &str) -> bool {
    arg.starts_with('/') || arg.starts_with("~/") || arg.starts_with("./") || arg == "~"
}

fn run_with_timeout(cmd: &str, args: &[String]) -> Result<std::process::Output, String> {
    let (sender, receiver) = mpsc::channel();
    let program = cmd.to_string();
    let argv = args.to_vec();
    std::thread::spawn(move || {
        let result = Command::new(&program)
            .args(argv)
            .stdin(Stdio::null())
            .output();
        let _ = sender.send(result);
    });

    match receiver.recv_timeout(Duration::from_secs(COMMAND_TIMEOUT_SECS)) {
        Ok(Ok(output)) => Ok(output),
        Ok(Err(error)) => Err(format!("Failed to run {cmd}: {error}")),
        Err(_) => Err(format!("Command timed out after {COMMAND_TIMEOUT_SECS}s: {cmd}")),
    }
}

