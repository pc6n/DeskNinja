use tauri::{AppHandle, LogicalPosition, Manager, Monitor, WebviewWindow};

const MAIN_LABEL: &str = "main";
const EDGE_PADDING: f64 = 12.0;

pub fn toggle_main_at_cursor(app: &AppHandle) -> Result<(), String> {
    let window = get_main(app)?;
    if window.is_visible().unwrap_or(false) {
        return window.hide().map_err(|error| error.to_string());
    }
    show_main_at_cursor(app)
}

fn show_main_at_cursor(app: &AppHandle) -> Result<(), String> {
    let window = get_main(app)?;
    let cursor = cursor_position();
    let (x, y) = window_position(&window, cursor)?;
    window
        .set_position(LogicalPosition::new(x, y))
        .map_err(|error| error.to_string())?;
    window.show().map_err(|error| error.to_string())?;
    let _ = window.unminimize();
    window.set_focus().map_err(|error| error.to_string())?;
    Ok(())
}

fn get_main(app: &AppHandle) -> Result<WebviewWindow, String> {
    app.get_webview_window(MAIN_LABEL)
        .ok_or_else(|| "main window not found".into())
}

fn cursor_position() -> (f64, f64) {
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
