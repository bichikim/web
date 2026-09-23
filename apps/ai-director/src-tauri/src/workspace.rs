use crate::upscale::{self, Method};
use base64::{Engine, engine::general_purpose::STANDARD};
use image::{DynamicImage, ImageFormat};
use serde::Serialize;
use std::{
    io::Cursor,
    path::{Path, PathBuf},
    process::{Child, Command, Stdio},
    sync::{
        Arc, Mutex,
        atomic::{AtomicBool, Ordering},
    },
    time::Duration,
};
use tauri::Manager;

pub struct Workspace {
    directory: tempfile::TempDir,
    operation: Mutex<()>,
    document: Mutex<Option<tempfile::TempDir>>,
    worker: Mutex<Option<Child>>,
    cancelled: AtomicBool,
}
impl Workspace {
    pub fn new() -> std::io::Result<Self> {
        Ok(Self {
            directory: tempfile::tempdir()?,
            operation: Mutex::new(()),
            document: Mutex::new(None),
            worker: Mutex::new(None),
            cancelled: AtomicBool::new(false),
        })
    }
    fn document_path(&self, name: &str) -> Result<PathBuf, String> {
        let document = self.document.lock().map_err(|_| "internal_error")?;
        Ok(document.as_ref().ok_or("no_image")?.path().join(name))
    }
    pub fn cancel(&self) -> Result<(), String> {
        self.cancelled.store(true, Ordering::SeqCst);
        let mut worker = self.worker.lock().map_err(|_| "internal_error")?;
        if let Some(child) = worker.as_mut() {
            child.kill().map_err(|_| "cancel_failed")?;
        }
        Ok(())
    }
}
impl Drop for Workspace {
    fn drop(&mut self) {
        if let Ok(worker) = self.worker.get_mut()
            && let Some(child) = worker.as_mut()
        {
            let _ = child.kill();
            let _ = child.wait();
        }
    }
}
#[derive(Serialize)]
pub struct Preview {
    width: u32,
    height: u32,
    url: String,
}
fn preview(image: &DynamicImage) -> Result<Preview, String> {
    let mut bytes = Cursor::new(Vec::new());
    image
        .thumbnail(1600, 1600)
        .write_to(&mut bytes, ImageFormat::Png)
        .map_err(|_| "preview_failed")?;
    Ok(Preview {
        width: image.width(),
        height: image.height(),
        url: format!(
            "data:image/png;base64,{}",
            STANDARD.encode(bytes.into_inner())
        ),
    })
}
fn import(workspace: &Workspace, path: &Path) -> Result<Preview, String> {
    let image = upscale::read(path)?;
    let result = preview(&image)?;
    let document = tempfile::tempdir_in(workspace.directory.path()).map_err(|_| "save_failed")?;
    image
        .save(document.path().join("input.png"))
        .map_err(|_| "save_failed")?;
    // Publish a complete document; cleanup of the previous document cannot change this result.
    *workspace.document.lock().map_err(|_| "internal_error")? = Some(document);
    Ok(result)
}
#[tauri::command]
pub async fn open_image(
    state: tauri::State<'_, Arc<Workspace>>,
) -> Result<Option<Preview>, String> {
    let workspace = state.inner().clone();
    tauri::async_runtime::spawn_blocking(move || {
        let _guard = workspace.operation.try_lock().map_err(|_| "busy")?;
        rfd::FileDialog::new()
            .add_filter("Image", &["png", "jpg", "jpeg", "webp"])
            .pick_file()
            .map(|path| import(&workspace, &path))
            .transpose()
    })
    .await
    .map_err(|_| "internal_error")?
}
#[tauri::command]
pub async fn capture_image(
    app: tauri::AppHandle,
    state: tauri::State<'_, Arc<Workspace>>,
) -> Result<Option<Preview>, String> {
    if !cfg!(target_os = "macos") {
        return Err("capture_unsupported".into());
    }
    let workspace = state.inner().clone();
    tauri::async_runtime::spawn_blocking(move || {
        let _guard = workspace.operation.try_lock().map_err(|_| "busy")?;
        let window = app.get_webview_window("main").ok_or("internal_error")?;
        let capture = workspace.directory.path().join("capture.png");
        if capture.exists() {
            std::fs::remove_file(&capture).map_err(|_| "capture_failed")?;
        }
        window.hide().map_err(|_| "capture_failed")?;
        std::thread::sleep(Duration::from_millis(250));
        let status = Command::new("/usr/sbin/screencapture")
            .args(["-i", "-s", "-x", "-t", "png"])
            .arg(&capture)
            .status();
        let restored = window.show();
        let _ = window.set_focus();
        restored.map_err(|_| "capture_failed")?;
        let status = status.map_err(|_| "capture_failed")?;
        if !capture.exists() {
            return if status.success() {
                Ok(None)
            } else {
                Err("capture_failed".into())
            };
        }
        import(&workspace, &capture).map(Some)
    })
    .await
    .map_err(|_| "internal_error")?
}
#[tauri::command]
pub async fn upscale_image(
    method: Method,
    state: tauri::State<'_, Arc<Workspace>>,
) -> Result<Option<Preview>, String> {
    let workspace = state.inner().clone();
    workspace.cancelled.store(false, Ordering::SeqCst);
    tauri::async_runtime::spawn_blocking(move || {
        let _guard = workspace.operation.try_lock().map_err(|_| "busy")?;
        let input = workspace.document_path("input.png")?;
        if !input.exists() {
            return Err("no_image".into());
        }
        let output = workspace.document_path("pending.png")?;
        let mut worker = workspace.worker.lock().map_err(|_| "internal_error")?;
        if workspace.cancelled.load(Ordering::SeqCst) {
            return Ok(None);
        }
        let child = Command::new(std::env::current_exe().map_err(|_| "internal_error")?)
            .arg("--upscale")
            .arg(&input)
            .arg(&output)
            .arg(match method {
                Method::Lanczos => "lanczos",
                Method::Spanf => "spanf",
            })
            .stdin(Stdio::null())
            .stdout(Stdio::null())
            .spawn()
            .map_err(|_| "upscale_failed")?;
        *worker = Some(child);
        drop(worker);
        let status = loop {
            let mut worker = workspace.worker.lock().map_err(|_| "internal_error")?;
            let child = worker.as_mut().ok_or("internal_error")?;
            if let Some(status) = child.try_wait().map_err(|_| "upscale_failed")? {
                *worker = None;
                break status;
            }
            drop(worker);
            std::thread::sleep(Duration::from_millis(40));
        };
        if !status.success() || workspace.cancelled.load(Ordering::SeqCst) {
            let _ = std::fs::remove_file(output);
            return if workspace.cancelled.load(Ordering::SeqCst) {
                Ok(None)
            } else {
                Err("upscale_failed".into())
            };
        }
        let image = image::open(&output).map_err(|_| "upscale_failed")?;
        let result = preview(&image)?;
        if workspace.cancelled.load(Ordering::SeqCst) {
            let _ = std::fs::remove_file(output);
            return Ok(None);
        }
        std::fs::rename(output, workspace.document_path("output.png")?)
            .map_err(|_| "save_failed")?;
        Ok(Some(result))
    })
    .await
    .map_err(|_| "internal_error")?
}
#[tauri::command]
pub fn cancel_upscale(state: tauri::State<'_, Arc<Workspace>>) -> Result<(), String> {
    state.cancel()
}
#[tauri::command]
pub async fn save_image(state: tauri::State<'_, Arc<Workspace>>) -> Result<bool, String> {
    let workspace = state.inner().clone();
    tauri::async_runtime::spawn_blocking(move || {
        let _guard = workspace.operation.try_lock().map_err(|_| "busy")?;
        let output = workspace.document_path("output.png")?;
        if !output.exists() {
            return Err("no_result".into());
        }
        match rfd::FileDialog::new()
            .add_filter("PNG", &["png"])
            .set_file_name("direction-4x.png")
            .save_file()
        {
            Some(path) => {
                std::fs::copy(output, path).map_err(|_| "save_failed")?;
                Ok(true)
            }
            None => Ok(false),
        }
    })
    .await
    .map_err(|_| "internal_error")?
}

#[cfg(test)]
#[path = "workspace/tests.rs"]
mod tests;
