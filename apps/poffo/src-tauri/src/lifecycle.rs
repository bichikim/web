use crate::backend::Backend;
use std::sync::Arc;
use std::sync::atomic::Ordering;
use tauri::Manager;
use tauri_plugin_dialog::{DialogExt, MessageDialogBuilder, MessageDialogButtons};

fn window_message(
    app: &tauri::AppHandle,
    message: impl Into<String>,
) -> MessageDialogBuilder<tauri::Wry> {
    let dialog = app.dialog().message(message).title("Poffo");
    match app.get_webview_window("main") {
        Some(window) => dialog.parent(&window),
        None => dialog,
    }
}

fn finish(app: tauri::AppHandle, backend: Arc<Backend>, discard: bool) {
    std::thread::spawn(move || match backend.stop(discard) {
        Ok(()) => {
            backend.allow_exit();
            app.exit(0);
        }
        Err(error) if error == "unsaved-document" => {
            let handle = app.clone();
            window_message(
                &app,
                "저장하지 않은 변경 사항이 있습니다. 종료하시겠습니까?",
            )
            .buttons(MessageDialogButtons::OkCancelCustom(
                "변경 사항을 남기고 종료".into(),
                "취소".into(),
            ))
            .show(move |confirmed| {
                if confirmed {
                    finish(handle, backend, true);
                } else {
                    backend.closing.store(false, Ordering::SeqCst);
                }
            });
        }
        Err(error) => {
            window_message(&app, error).show(move |_| {
                backend.closing.store(false, Ordering::SeqCst);
            });
        }
    });
}

pub fn request_exit(app: &tauri::AppHandle) {
    let backend = app.state::<Arc<Backend>>().inner().clone();
    if backend.closing.swap(true, Ordering::SeqCst) {
        return;
    }
    finish(app.clone(), backend, false);
}
