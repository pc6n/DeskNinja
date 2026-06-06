use serde::Serialize;
use std::collections::HashMap;
use std::sync::LazyLock;
use std::time::{SystemTime, UNIX_EPOCH};
use parking_lot::Mutex;
use tauri::window::Color;
use crate::commands::macos::capture_selection_for_menu;
use tauri::{AppHandle, Emitter, LogicalPosition, LogicalSize, Manager, Monitor, WebviewWindow};

pub const PANEL_LABEL: &str = "quick-panel";
pub const ACTION_MENU_LABEL: &str = "action-menu";
pub const ABOUT_LABEL: &str = "about";
const EDGE_PADDING: f64 = 12.0;
const FOCUS_GUARD_MS: u64 = 400;

static LAST_SHOWN_MS: LazyLock<Mutex<HashMap<String, u64>>> =
    LazyLock::new(|| Mutex::new(HashMap::new()));

fn now_ms() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|value| value.as_millis() as u64)
        .unwrap_or(0)
}

fn mark_window_shown(label: &str) {
    LAST_SHOWN_MS
        .lock()
        .insert(label.to_string(), now_ms());
}

pub fn should_ignore_focus_lost(label: &str) -> bool {
    let last = LAST_SHOWN_MS.lock().get(label).copied().unwrap_or(0);
    now_ms().saturating_sub(last) < FOCUS_GUARD_MS
}

#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct ActionMenuOpenPayload {
    pub selected_text: Option<String>,
}

pub fn configure_popup_window(app: &AppHandle, label: &str) -> Result<(), String> {
    let window = get_window(app, label)?;
    window
        .set_background_color(Some(Color(0, 0, 0, 0)))
        .map_err(|error| error.to_string())?;
    window.set_shadow(false).map_err(|error| error.to_string())?;
    if label == PANEL_LABEL {
        window
            .set_min_size(Some(LogicalSize::new(360.0, 320.0)))
            .map_err(|error| error.to_string())?;
    }
    Ok(())
}

pub fn toggle_panel_at_cursor(app: &AppHandle) -> Result<(), String> {
    toggle_window_at_cursor(app, PANEL_LABEL)
}

/// ⌘J: toggle chat/todo panel (always — does not steal selection or clipboard).
pub fn toggle_deskninja_at_cursor(app: &AppHandle) -> Result<(), String> {
    if window_visible(app, ACTION_MENU_LABEL)? {
        return hide_window(app, ACTION_MENU_LABEL);
    }
    toggle_window_at_cursor(app, PANEL_LABEL)
}

/// ⌘⇧J: context actions when text is selected in another app.
pub fn toggle_context_action_at_cursor(app: &AppHandle) -> Result<(), String> {
    if window_visible(app, ACTION_MENU_LABEL)? {
        return hide_window(app, ACTION_MENU_LABEL);
    }
    if window_visible(app, PANEL_LABEL)? {
        let _ = hide_window(app, PANEL_LABEL);
    }
    let has_selection = capture_selection_for_menu(app)
        .ok()
        .flatten()
        .is_some_and(|text| !text.trim().is_empty());
    if has_selection {
        return open_action_menu_at_cursor(app);
    }
    show_window_at_cursor(app, PANEL_LABEL)
}

fn window_visible(app: &AppHandle, label: &str) -> Result<bool, String> {
    Ok(get_window(app, label)?.is_visible().unwrap_or(false))
}

pub fn open_action_menu_at_cursor(app: &AppHandle) -> Result<(), String> {
    show_window_at_cursor(app, ACTION_MENU_LABEL)?;
    app.emit(
        "action-menu:open",
        ActionMenuOpenPayload { selected_text: None },
    )
    .map_err(|error| error.to_string())?;
    Ok(())
}

pub fn hide_window(app: &AppHandle, label: &str) -> Result<(), String> {
    get_window(app, label)?.hide().map_err(|error| error.to_string())
}

pub fn show_about_window(app: &AppHandle) -> Result<(), String> {
    let window = get_window(app, ABOUT_LABEL)?;
    center_on_screen(&window)?;
    window.show().map_err(|error| error.to_string())?;
    window.set_focus().map_err(|error| error.to_string())?;
    Ok(())
}

fn center_on_screen(window: &WebviewWindow) -> Result<(), String> {
    let monitor = window
        .current_monitor()
        .map_err(|error| error.to_string())?
        .ok_or_else(|| "no monitor".to_string())?;
    let scale = monitor.scale_factor();
    let size = window.outer_size().map_err(|error| error.to_string())?;
    let (area_x, area_y, area_w, area_h) = work_area_logical(&monitor);
    let width = size.width as f64 / scale;
    let height = size.height as f64 / scale;
    let x = area_x + (area_w - width) / 2.0;
    let y = area_y + (area_h - height) / 2.0;
    window
        .set_position(LogicalPosition::new(x, y))
        .map_err(|error| error.to_string())
}

fn toggle_window_at_cursor(app: &AppHandle, label: &str) -> Result<(), String> {
    let window = get_window(app, label)?;
    if window.is_visible().unwrap_or(false) {
        return window.hide().map_err(|error| error.to_string());
    }
    show_window_at_cursor(app, label)
}

fn show_window_at_cursor(app: &AppHandle, label: &str) -> Result<(), String> {
    let window = get_window(app, label)?;
    let cursor = cursor_position();
    let (x, y) = window_position(&window, cursor)?;
    window
        .set_visible_on_all_workspaces(true)
        .map_err(|error| error.to_string())?;
    window
        .set_position(LogicalPosition::new(x, y))
        .map_err(|error| error.to_string())?;
    window.show().map_err(|error| error.to_string())?;
    window.set_focus().map_err(|error| error.to_string())?;
    mark_window_shown(label);
    Ok(())
}

fn get_window(app: &AppHandle, label: &str) -> Result<WebviewWindow, String> {
    app.get_webview_window(label)
        .ok_or_else(|| format!("window not found: {label}"))
}

pub fn cursor_position() -> (f64, f64) {
    #[cfg(target_os = "macos")]
    {
        use mouse_position::mouse_position::Mouse;
        return match Mouse::get_mouse_position() {
            Mouse::Position { x, y } => (x as f64, y as f64),
            Mouse::Error => (120.0, 120.0),
        };
    }
    #[cfg(not(target_os = "macos"))]
    {
        (120.0, 120.0)
    }
}

fn window_position(window: &WebviewWindow, cursor: (f64, f64)) -> Result<(f64, f64), String> {
    let scale = window.scale_factor().map_err(|error| error.to_string())?;
    let size = window.outer_size().map_err(|error| error.to_string())?;
    let width = size.width as f64 / scale;
    let height = size.height as f64 / scale;
    let monitor = monitor_for_cursor(window, cursor)?;
    let (area_x, area_y, area_w, area_h) = work_area_logical(&monitor);
    let (cx, cy) = cursor;
    let x = clamp_x(cx + EDGE_PADDING, width, area_x, area_w);
    let y = pick_y(cy, height, area_y, area_h);
    Ok((x, y))
}

fn pick_y(cy: f64, height: f64, area_y: f64, area_h: f64) -> f64 {
    let below = cy + EDGE_PADDING;
    if below + height <= area_y + area_h {
        return below;
    }
    clamp_y(cy - height - EDGE_PADDING, height, area_y, area_h)
}

fn clamp_y(y: f64, height: f64, area_y: f64, area_h: f64) -> f64 {
    let min_y = area_y + EDGE_PADDING;
    let max_y = area_y + area_h - height - EDGE_PADDING;
    y.clamp(min_y, max_y.max(min_y))
}

fn clamp_x(x: f64, width: f64, area_x: f64, area_w: f64) -> f64 {
    let min_x = area_x + EDGE_PADDING;
    let max_x = area_x + area_w - width - EDGE_PADDING;
    x.clamp(min_x, max_x.max(min_x))
}

fn work_area_logical(monitor: &Monitor) -> (f64, f64, f64, f64) {
    let scale = monitor.scale_factor();
    let area = monitor.work_area();
    let x = area.position.x as f64 / scale;
    let y = area.position.y as f64 / scale;
    let w = area.size.width as f64 / scale;
    let h = area.size.height as f64 / scale;
    (x, y, w, h)
}

fn monitor_for_cursor(window: &WebviewWindow, cursor: (f64, f64)) -> Result<Monitor, String> {
    if let Some(monitor) = window.current_monitor().map_err(|error| error.to_string())? {
        return Ok(monitor);
    }
    let monitors = window.available_monitors().map_err(|error| error.to_string())?;
    if let Some(monitor) = monitors.iter().find(|m| contains_cursor(m, cursor)) {
        return Ok(monitor.clone());
    }
    monitors
        .into_iter()
        .next()
        .ok_or_else(|| "no monitor".into())
}

fn contains_cursor(monitor: &Monitor, cursor: (f64, f64)) -> bool {
    let (x, y, w, h) = work_area_logical(monitor);
    let (cx, cy) = cursor;
    cx >= x && cx <= x + w && cy >= y && cy <= y + h
}
