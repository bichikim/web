use tauri::{AppHandle, Emitter, Manager, Window, WindowEvent};

const WINDOW_LABEL: &str = "manager";
const VISIBILITY_EVENT: &str = "wallpaper-settings-visible";

pub(crate) fn show(app: &AppHandle) -> tauri::Result<()> {
    let window = app
        .get_webview_window(WINDOW_LABEL)
        .ok_or(tauri::Error::WindowNotFound)?;

    window.unminimize()?;
    window.show()?;
    window.emit_to(WINDOW_LABEL, VISIBILITY_EVENT, true)?;
    window.set_focus()
}

pub(crate) fn handle_window_event(window: &Window, event: &WindowEvent) {
    if window.label() != WINDOW_LABEL {
        return;
    }

    if let WindowEvent::CloseRequested { api, .. } = event {
        // Keep the widget and background host running while its settings UI is unmounted.
        api.prevent_close();
        if let Err(error) = window
            .hide()
            .and_then(|()| window.emit_to(WINDOW_LABEL, VISIBILITY_EVENT, false))
        {
            eprintln!("Failed to hide wallpaper settings: {error}");
        }
    }
}
