use std::process::Command;
use std::thread;
use std::time::Duration;

const KEY_DELAY_MS: u64 = 80;

pub fn simulate_copy() -> Result<(), String> {
    run_keystroke("c")
}

pub fn simulate_paste() -> Result<(), String> {
    thread::sleep(Duration::from_millis(KEY_DELAY_MS));
    run_keystroke("v")
}

fn run_keystroke(key: &str) -> Result<(), String> {
    let script = format!(
        "tell application \"System Events\" to keystroke \"{key}\" using command down"
    );
    let ok = Command::new("osascript")
        .args(["-e", &script])
        .status()
        .map_err(|error| error.to_string())?
        .success();
    if ok {
        Ok(())
    } else {
        Err("Keystroke failed — grant Accessibility access in System Settings.".into())
    }
}
