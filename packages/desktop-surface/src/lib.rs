mod commands;
mod error;
#[cfg(target_os = "macos")]
mod macos;
mod model;

use tauri::{Manager, Runtime, plugin::TauriPlugin};

#[cfg(target_os = "macos")]
use macos::SurfaceState;

#[cfg(not(target_os = "macos"))]
#[derive(Default)]
struct SurfaceState;

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
            commands::get_background_interaction,
            commands::open_control_surface,
            commands::restore_surface,
            commands::set_background_interaction,
            commands::set_background_surface,
            commands::set_widget_surface,
        ])
        .build()
}
