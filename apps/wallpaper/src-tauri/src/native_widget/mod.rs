//! The widget WebView owns input and settings. Its platform layer owns only drawing.

mod coordinates;
mod packet;
mod session;
#[cfg_attr(target_os = "macos", path = "surface/macos.rs")]
#[cfg_attr(windows, path = "surface/windows.rs")]
mod surface;

use session::{Draw, Open, Playback, Session};
use std::{
    collections::HashMap,
    sync::{Mutex, mpsc},
};
use tauri::{
    AppHandle, Manager, State, Webview,
    ipc::{Request, Response},
};
use tokio::sync::oneshot;

type BytesReply = oneshot::Sender<Result<Vec<u8>, String>>;

enum Message {
    Playback(Playback, Vec<u8>, BytesReply),
    Present(Draw, Vec<u8>, BytesReply),
    Alpha(oneshot::Sender<Result<session::AlphaResult, String>>),
    Release(u32),
}

#[derive(Default)]
pub(crate) struct NativeWidgets(Mutex<HashMap<(String, String), mpsc::SyncSender<Message>>>);

fn trusted(caller: &Webview) -> Result<(), String> {
    let url = caller.url().map_err(|error| error.to_string())?;
    if caller.label().starts_with("poffo-widget-") && crate::frontend::owns(&url) {
        Ok(())
    } else {
        Err("Only a local character widget may open a native renderer".into())
    }
}

#[tauri::command]
pub(crate) fn native_widget_backend(caller: Webview) -> Option<&'static str> {
    let backend = surface::BACKEND;
    trusted(&caller)
        .ok()
        .filter(|()| {
            std::env::var_os("POFFO_WIDGET_RENDERER").is_some_and(|value| value == backend)
        })
        .map(|()| backend)
}

fn start_thread(
    surface: surface::Target,
    open: Open,
    bytes: Vec<u8>,
) -> (
    mpsc::SyncSender<Message>,
    oneshot::Receiver<Result<(), String>>,
) {
    let (outbox, inbox) = mpsc::sync_channel(32);
    let (opened, ready) = oneshot::channel();
    // The playback cache has thread-local Rc ownership. This thread also owns GPU queue ordering.
    std::thread::spawn(move || {
        let boot = surface::render_scope(|| {
            let renderer =
                tauri::async_runtime::block_on(surface::open(surface, open.size, &open.metadata))?;
            Session::new(renderer, open.textures, &bytes)
        });
        let mut session = match boot {
            Ok(session) => {
                if opened.send(Ok(())).is_err() {
                    return;
                }
                session
            }
            Err(error) => {
                let _ = opened.send(Err(error));
                return;
            }
        };
        drop(bytes);
        while let Ok(message) = inbox.recv() {
            surface::render_scope(|| match message {
                Message::Playback(command, bytes, response) => {
                    let _ = response.send(tauri::async_runtime::block_on(
                        session.playback(command, bytes),
                    ));
                }
                Message::Present(command, bytes, response) => {
                    let _ = response.send(tauri::async_runtime::block_on(
                        session.present(command, bytes),
                    ));
                }
                Message::Release(frame) => session.renderer.release(frame),
                Message::Alpha(result) => {
                    let _ = result.send(session.take_alpha());
                }
            });
        }
    });
    (outbox, ready)
}

#[tauri::command]
pub(crate) async fn open_widget_native(
    caller: Webview,
    request: Request<'_>,
    state: State<'_, NativeWidgets>,
) -> Result<String, String> {
    if native_widget_backend(caller.clone()).is_none() {
        return Err("Native rendering is disabled for this widget".into());
    }
    let (open, bytes) = packet::read::<Open>(&request)?;
    session::check_size(open.size)?;
    let id = uuid::Uuid::new_v4().to_string();
    let target = surface::attach(&caller, id.clone()).await?;
    let (sender, ready) = start_thread(target, open, bytes);
    let result = ready
        .await
        .map_err(|error| error.to_string())
        .and_then(|result| result);
    if let Err(error) = result.and_then(|()| trusted(&caller)) {
        #[cfg(target_os = "macos")]
        surface::detach(caller.app_handle(), id);
        return Err(error);
    }
    state
        .inner()
        .0
        .lock()
        .map_err(|error| error.to_string())?
        .insert((caller.label().into(), id.clone()), sender);
    Ok(id)
}

fn dispatch(
    state: &NativeWidgets,
    caller: &Webview,
    id: &str,
    message: Message,
) -> Result<(), String> {
    trusted(caller)?;
    state
        .0
        .lock()
        .map_err(|error| error.to_string())?
        .get(&(caller.label().into(), id.into()))
        .ok_or("Native surface was closed")?
        .try_send(message)
        .map_err(|error| error.to_string())
}

#[tauri::command]
pub(crate) async fn play_widget_native(
    caller: Webview,
    request: Request<'_>,
    state: State<'_, NativeWidgets>,
) -> Result<Response, String> {
    let (playback, bytes) = packet::read::<Playback>(&request)?;
    let id = playback.id.clone();
    let (send, result) = oneshot::channel();
    dispatch(
        &state,
        &caller,
        &id,
        Message::Playback(playback, bytes, send),
    )?;
    Ok(Response::new(
        result.await.map_err(|error| error.to_string())??,
    ))
}

#[tauri::command]
pub(crate) async fn present_widget_native(
    caller: Webview,
    request: Request<'_>,
    state: State<'_, NativeWidgets>,
) -> Result<Response, String> {
    let (draw, bytes) = packet::read::<Draw>(&request)?;
    let id = draw.id.clone();
    let (send, result) = oneshot::channel();
    dispatch(&state, &caller, &id, Message::Present(draw, bytes, send))?;
    Ok(Response::new(
        result.await.map_err(|error| error.to_string())??,
    ))
}

#[tauri::command]
pub(crate) async fn read_widget_native_alpha(
    caller: Webview,
    id: String,
    state: State<'_, NativeWidgets>,
) -> Result<Response, String> {
    let (send, result) = oneshot::channel();
    dispatch(&state, &caller, &id, Message::Alpha(send))?;
    let alpha = result.await.map_err(|error| error.to_string())??;
    Ok(Response::new(
        alpha.await.map_err(|error| error.to_string())??,
    ))
}

#[tauri::command]
pub(crate) fn release_widget_native(
    caller: Webview,
    id: String,
    frame: u32,
    state: State<'_, NativeWidgets>,
) -> Result<(), String> {
    dispatch(&state, &caller, &id, Message::Release(frame))
}

#[tauri::command]
pub(crate) fn close_widget_native(
    caller: Webview,
    id: String,
    state: State<'_, NativeWidgets>,
) -> Result<(), String> {
    trusted(&caller)?;
    state
        .inner()
        .0
        .lock()
        .map_err(|error| error.to_string())?
        .remove(&(caller.label().into(), id.clone()));
    #[cfg(target_os = "macos")]
    surface::detach(caller.app_handle(), id);
    Ok(())
}

pub(crate) fn close_window(app: &AppHandle, label: &str) {
    if !label.starts_with("poffo-widget-") {
        return;
    }
    if let Ok(mut sessions) = app.state::<NativeWidgets>().inner().0.lock() {
        sessions.retain(|(owner, _), _| owner != label);
    }
    #[cfg(target_os = "macos")]
    surface::detach_window(app, label.into());
}
