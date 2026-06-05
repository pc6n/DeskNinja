use tauri::{
    menu::{Menu, MenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    App, AppHandle,
};

use crate::window::{show_about_window, toggle_deskninja_at_cursor};

const TRAY_ID: &str = "deskninja-tray";

pub(crate) fn tray_icon() -> tauri::Result<tauri::image::Image<'static>> {
    #[cfg(target_os = "macos")]
    const BYTES: &[u8] = include_bytes!("../../assets/tray-iconTemplate@2x.png");
    #[cfg(not(target_os = "macos"))]
    const BYTES: &[u8] = include_bytes!("../../assets/tray-iconTemplate.png");

    tauri::image::Image::from_bytes(BYTES)
}

pub fn setup_tray(app: &App) -> Result<(), Box<dyn std::error::Error>> {
    let open = MenuItem::with_id(app, "tray-open", "Open (⌘J)", true, None::<&str>)?;
    let about = MenuItem::with_id(app, "tray-about", "About DeskNinja", true, None::<&str>)?;
    let quit = MenuItem::with_id(app, "tray-quit", "Quit", true, None::<&str>)?;
    let menu = Menu::with_items(app, &[&open, &about, &quit])?;
    let icon = tray_icon()?;

    let mut builder = TrayIconBuilder::with_id(TRAY_ID)
        .icon(icon)
        .tooltip("DeskNinja")
        .menu(&menu)
        .show_menu_on_left_click(false)
        .on_menu_event(|app, event| handle_menu(app, event.id.as_ref()))
        .on_tray_icon_event(|tray, event| handle_click(tray.app_handle(), event));
    #[cfg(target_os = "macos")]
    {
        builder = builder.icon_as_template(true);
    }
    let _tray = builder.build(app)?;

    Ok(())
}

fn handle_menu(app: &AppHandle, id: &str) {
    match id {
        "tray-open" => {
            let _ = toggle_deskninja_at_cursor(app);
        }
        "tray-about" => {
            let _ = show_about_window(app);
        }
        "tray-quit" => app.exit(0),
        _ => {}
    }
}

fn handle_click(app: &AppHandle, event: TrayIconEvent) {
    let TrayIconEvent::Click {
        button: MouseButton::Left,
        button_state: MouseButtonState::Up,
        ..
    } = event
    else {
        return;
    };
    let _ = toggle_deskninja_at_cursor(app);
}
