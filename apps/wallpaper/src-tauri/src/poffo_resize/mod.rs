#[cfg(target_os = "macos")]
mod frame;
#[cfg(target_os = "macos")]
mod macos;

use serde::Deserialize;
use tauri::{AppHandle, Webview};

#[derive(Clone, Copy, Deserialize)]
pub(crate) enum Direction {
    East,
    North,
    NorthEast,
    NorthWest,
    South,
    SouthEast,
    SouthWest,
    West,
}

#[cfg(target_os = "macos")]
pub(crate) use macos::handle_event;

#[tauri::command]
pub(crate) async fn start_poffo_resize(
    app: AppHandle,
    caller: Webview,
    direction: Direction,
) -> Result<bool, String> {
    if !caller.label().starts_with("poffo-widget-") || caller.window().label() != caller.label() {
        return Err("Only Poffo widgets can resize their own window".to_owned());
    }
    #[cfg(target_os = "macos")]
    {
        if !crate::hit_test::available(&app) {
            return Err("Native pointer monitoring is unavailable".to_owned());
        }
        let (sender, mut receiver) = tauri::async_runtime::channel(1);
        app.run_on_main_thread(move || {
            let _ = sender.try_send(macos::begin(&caller.window(), direction));
        })
        .map_err(|error| error.to_string())?;
        receiver
            .recv()
            .await
            .ok_or_else(|| "Cannot start Poffo resizing".to_owned())??;
        Ok(true)
    }
    #[cfg(not(target_os = "macos"))]
    {
        let _ = (app, direction);
        Ok(false)
    }
}
