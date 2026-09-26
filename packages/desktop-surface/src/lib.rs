mod commands;
mod error;
#[cfg(target_os = "macos")]
mod macos;
mod model;
#[cfg(any(target_os = "macos", target_os = "windows"))]
mod pointer;
#[cfg(target_os = "windows")]
mod windows;

use tauri::{Manager, Runtime, plugin::TauriPlugin};

#[cfg(target_os = "macos")]
use macos as platform;

#[cfg(not(any(target_os = "macos", target_os = "windows")))]
#[derive(Default)]
struct SurfaceState;

#[cfg(any(target_os = "macos", target_os = "windows"))]
use platform::SurfaceState;
#[cfg(target_os = "windows")]
use windows as platform;

pub fn init<R: Runtime>() -> TauriPlugin<R> {
    tauri::plugin::Builder::new("desktop-surface")
        .setup(|app, _api| {
            app.manage(SurfaceState::default());

            #[cfg(target_os = "macos")]
            macos::install_lifecycle_observers(app.clone());

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::close_control_surface,
            commands::forward_background_mouse_event,
            commands::get_background_interaction,
            commands::navigate_background_surface,
            commands::open_control_surface,
            commands::restore_background_content,
            commands::restore_surface,
            commands::set_background_interaction,
            commands::set_background_surface,
            commands::set_widget_surface,
        ])
        .build()
}
