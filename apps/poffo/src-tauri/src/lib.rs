mod backend;
mod lifecycle;
mod runtime_paths;

use backend::{Attachment, Backend};
use runtime_paths::RuntimePaths;
use std::sync::Arc;
use std::sync::atomic::Ordering;
use tauri::Manager;

#[tauri::command]
fn connect_backend(backend: tauri::State<'_, Arc<Backend>>) -> Attachment {
    backend.attachment.clone()
}

#[tauri::command]
fn request_app_exit(app: tauri::AppHandle) {
    lifecycle::request_exit(&app);
}

#[tauri::command]
fn install_cli(backend: tauri::State<'_, Arc<Backend>>) -> Result<serde_json::Value, String> {
    backend.install_cli()
}

fn argument(name: &str) -> Option<std::path::PathBuf> {
    let arguments: Vec<_> = std::env::args_os().collect();
    arguments
        .windows(2)
        .find(|pair| pair[0] == name)
        .map(|pair| pair[1].clone().into())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            connect_backend,
            install_cli,
            request_app_exit
        ])
        .setup(|app| {
            let executable = std::env::current_exe()?;
            let mut runtime = RuntimePaths::installed(&executable)?;
            if cfg!(debug_assertions) {
                let root = std::path::Path::new(env!("CARGO_MANIFEST_DIR"));
                let suffix = if cfg!(windows) { ".exe" } else { "" };
                runtime.root = root.join("runtime");
                runtime.node = root.join(format!(
                    "binaries/poffo-node-{}{suffix}",
                    env!("TAURI_ENV_TARGET_TRIPLE")
                ));
            }
            let workspace =
                argument("--workspace").unwrap_or(app.path().app_data_dir()?.join("workspace"));
            let origin = if cfg!(debug_assertions) {
                app.config()
                    .build
                    .dev_url
                    .as_ref()
                    .map(|url| url.origin().ascii_serialization())
            } else {
                None
            };
            let backend = Backend::start(runtime, workspace, origin, argument("--file"))?;
            app.manage(backend);
            Ok(())
        })
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                api.prevent_close();
                lifecycle::request_exit(window.app_handle());
            }
        })
        .build(tauri::generate_context!())
        .expect("Poffo desktop runtime failed")
        .run(|app, event| {
            if let tauri::RunEvent::ExitRequested { api, .. } = event {
                if !app.state::<Arc<Backend>>().exiting.load(Ordering::SeqCst) {
                    api.prevent_exit();
                    lifecycle::request_exit(app);
                }
            }
        });
}
