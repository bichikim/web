use tauri::{AppHandle, Manager, Window, WindowEvent};

const WINDOW_LABEL: &str = "manager";

pub(crate) fn show(app: &AppHandle) -> tauri::Result<()> {
    let window = app
        .get_webview_window(WINDOW_LABEL)
        .ok_or(tauri::Error::WindowNotFound)?;

    window.unminimize()?;
    window.show()?;
    window.set_focus()
}

pub(crate) fn handle_window_event(window: &Window, event: &WindowEvent) {
    if window.label() != WINDOW_LABEL {
        return;
    }

    if let WindowEvent::CloseRequested { api, .. } = event {
        // Keep the utility alive and retain the settings window for the next tray request.
        api.prevent_close();
        if let Err(error) = window.hide() {
            eprintln!("Failed to hide wallpaper settings: {error}");
        }
    }
}
