#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri::Manager;

mod upscale;
mod workspace;

fn main() {
    let arguments: Vec<String> = std::env::args().collect();
    if arguments
        .get(1)
        .is_some_and(|argument| argument == "--upscale")
    {
        if let Err(error) = upscale::run_worker(&arguments) {
            eprintln!("{error}");
            std::process::exit(1);
        }
        return;
    }
    tauri::Builder::default()
        .manage(std::sync::Arc::new(
            workspace::Workspace::new().expect("Temporary workspace"),
        ))
        .on_window_event(|window, event| {
            if matches!(event, tauri::WindowEvent::Destroyed) {
                let state = window.state::<std::sync::Arc<workspace::Workspace>>();
                let _ = state.cancel();
            }
        })
        .invoke_handler(tauri::generate_handler![
            workspace::open_image,
            workspace::capture_image,
            workspace::upscale_image,
            workspace::cancel_upscale,
            workspace::save_image
        ])
        .run(tauri::generate_context!())
        .expect("Failed to run AI Director");
}
