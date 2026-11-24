//! Owns the isolated built-in origin and an original-preserving storage copy.
mod http;
mod storage;
use std::{
    net::TcpListener,
    sync::{Arc, Mutex},
};
use tauri::{AppHandle, Manager, State, WebviewUrl, WebviewWindow, WebviewWindowBuilder};
use tokio::sync::oneshot;
pub(crate) struct Frontend {
    listener: Mutex<Option<TcpListener>>,
    stop: Mutex<Option<oneshot::Sender<()>>>,
    copy: Arc<storage::Copy>,
}
impl Frontend {
    pub fn configure(context: &mut tauri::Context<tauri::Wry>) -> Result<Self, String> {
        let listener = if tauri::is_dev() {
            None
        } else {
            context.config_mut().build.frontend_dist = Some(
                tauri::utils::config::FrontendDist::Url(http::ORIGIN.parse().unwrap()),
            );
            Some(
                TcpListener::bind("127.0.0.1:1431")
                    .map_err(|e| format!("Cannot bind isolated frontend: {e}"))?,
            )
        };
        Ok(Self {
            listener: Mutex::new(listener),
            stop: Mutex::new(None),
            copy: Arc::new(storage::Copy::default()),
        })
    }
    pub fn start(&self, app: &AppHandle) -> Result<(), String> {
        let Some(listener) = self.listener.lock().unwrap().take() else {
            self.copy.complete_dev();
            return Ok(());
        };
        let (send, receive) = oneshot::channel();
        *self.stop.lock().unwrap() = Some(send);
        let assets = app.asset_resolver();
        tauri::async_runtime::spawn(async move {
            if let Err(error) = http::serve(listener, assets, receive).await {
                eprintln!("Frontend server stopped: {error}")
            }
        });
        if !self.copy.setup(
            app.path()
                .app_data_dir()
                .map_err(|e| e.to_string())?
                .join("origin-copy"),
        )? {
            WebviewWindowBuilder::new(
                app,
                "storage-origin",
                WebviewUrl::CustomProtocol(
                    "tauri://localhost/index.html?surface=storage-origin"
                        .parse()
                        .unwrap(),
                ),
            )
            .title("Wallpaper storage copy")
            .visible(false)
            .build()
            .map_err(|e| e.to_string())?;
        }
        Ok(())
    }
    pub fn stop(&self) {
        if let Some(stop) = self.stop.lock().unwrap().take() {
            let _ = stop.send(());
        }
    }
}
fn exporting(window: &WebviewWindow) -> Result<(), String> {
    if window.label() == "storage-origin"
        && window
            .url()
            .is_ok_and(|url| url.scheme() == "tauri" && url.host_str() == Some("localhost"))
    {
        Ok(())
    } else {
        Err("Storage export requires the original built-in window".into())
    }
}
fn importing(window: &WebviewWindow) -> Result<(), String> {
    if window.label() == "manager"
        && (tauri::is_dev()
            || window
                .url()
                .is_ok_and(|url| url.origin().ascii_serialization() == http::ORIGIN))
    {
        Ok(())
    } else {
        Err("Storage import requires the isolated manager window".into())
    }
}
#[tauri::command]
pub(crate) fn append_storage_export(
    window: WebviewWindow,
    request: tauri::ipc::Request<'_>,
    frontend: State<'_, Frontend>,
) -> Result<(), String> {
    exporting(&window)?;
    let index = request
        .headers()
        .get("x-database-index")
        .and_then(|v| v.to_str().ok())
        .and_then(|v| v.parse().ok())
        .ok_or("Missing database index")?;
    let offset = request
        .headers()
        .get("x-file-offset")
        .and_then(|v| v.to_str().ok())
        .and_then(|v| v.parse().ok())
        .ok_or("Missing export offset")?;
    match request.body() {
        tauri::ipc::InvokeBody::Raw(bytes) => frontend.copy.append(index, offset, bytes),
        _ => Err("Storage exports require binary data".into()),
    }
}
#[tauri::command]
pub(crate) async fn stage_storage_copy(
    window: WebviewWindow,
    manifest: storage::Manifest,
    frontend: State<'_, Frontend>,
) -> Result<(), String> {
    exporting(&window)?;
    let copy = Arc::clone(&frontend.copy);
    tauri::async_runtime::spawn_blocking(move || copy.stage(manifest))
        .await
        .map_err(|e| e.to_string())?
}
#[tauri::command]
pub(crate) async fn pending_storage_copy(
    window: WebviewWindow,
    frontend: State<'_, Frontend>,
) -> Result<Option<storage::Manifest>, String> {
    if !tauri::is_dev()
        && !window
            .url()
            .is_ok_and(|url| url.origin().ascii_serialization() == http::ORIGIN)
    {
        return Err("Storage requires the built-in origin".into());
    }
    if window.label() == "manager" {
        frontend.copy.pending().await
    } else {
        frontend.copy.ready().await?;
        Ok(None)
    }
}
#[tauri::command]
pub(crate) fn read_storage_export(
    window: WebviewWindow,
    index: usize,
    offset: u64,
    frontend: State<'_, Frontend>,
) -> Result<tauri::ipc::Response, String> {
    importing(&window)?;
    frontend
        .copy
        .read(index, offset)
        .map(tauri::ipc::Response::new)
}
#[tauri::command]
pub(crate) fn complete_storage_copy(
    window: WebviewWindow,
    frontend: State<'_, Frontend>,
    app: AppHandle,
) -> Result<(), String> {
    importing(&window)?;
    frontend.copy.complete()?;
    if let Some(window) = app.get_webview_window("storage-origin") {
        window.close().map_err(|e| e.to_string())?;
    }
    Ok(())
}
#[tauri::command]
pub(crate) fn fail_storage_copy(
    window: WebviewWindow,
    error: String,
    frontend: State<'_, Frontend>,
) -> Result<(), String> {
    exporting(&window)?;
    frontend.copy.fail(error.chars().take(512).collect());
    Ok(())
}

pub(crate) fn owns(url: &tauri::Url) -> bool {
    url.origin().ascii_serialization() == http::ORIGIN
}
