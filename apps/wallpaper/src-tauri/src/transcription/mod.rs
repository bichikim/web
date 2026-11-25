use serde::{Deserialize, Serialize};
use std::{collections::HashMap, sync::Mutex};
use tauri::{Manager, State, WebviewWindow};
use tokio::sync::oneshot;

use crate::model_cache as asset;
mod buzz;
mod runtime;
#[cfg(test)]
mod tests;
#[cfg(test)]
use runtime::write_wave;
#[cfg(test)]
use std::path::Path;

#[derive(Clone, Copy, Deserialize)]
pub enum Model {
    #[serde(rename = "buzzasr-korean-q8")]
    BuzzKorean,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub enum Error {
    InvalidRequest,
    DesktopOnly,
    RuntimeMissing,
    Unavailable,
    Busy,
    Cancelled,
}

#[derive(Deserialize)]
pub struct Request {
    id: String,
    audio: Vec<f32>,
    model: Model,
    vad: bool,
}

type RequestKey = (String, String);
#[derive(Default)]
pub struct Requests(Mutex<HashMap<RequestKey, Option<oneshot::Sender<()>>>>);

impl Requests {
    fn begin(&self, key: &RequestKey) -> Result<oneshot::Receiver<()>, Error> {
        let mut pending = self.0.lock().map_err(|_| Error::Unavailable)?;
        // Cancellation can reach the synchronous command before this async command is polled.
        if matches!(pending.get(key), Some(None)) {
            pending.remove(key);
            return Err(Error::Cancelled);
        }
        if pending
            .iter()
            .any(|((owner, _), sender)| owner == &key.0 && sender.is_some())
        {
            return Err(Error::Busy);
        }
        let (cancel, cancelled) = oneshot::channel();
        pending.insert(key.clone(), Some(cancel));
        Ok(cancelled)
    }

    fn cancel(&self, key: RequestKey) {
        if let Ok(mut pending) = self.0.lock() {
            if matches!(pending.remove(&key), Some(Some(_))) {
                return;
            }
            const MAX_CANCELLED: usize = 32;
            if pending
                .iter()
                .filter(|((owner, _), sender)| owner == &key.0 && sender.is_none())
                .count()
                >= MAX_CANCELLED
            {
                pending.retain(|(owner, _), sender| owner != &key.0 || sender.is_some());
            }
            pending.insert(key, None);
        }
    }

    fn finish(&self, key: &RequestKey) {
        if let Ok(mut pending) = self.0.lock() {
            pending.remove(key);
        }
    }

    pub fn remove(&self, owner: &str) {
        if let Ok(mut pending) = self.0.lock() {
            pending.retain(|(window, _), _| window != owner);
        }
    }
}

#[tauri::command]
pub async fn transcribe_local_audio(
    window: WebviewWindow,
    requests: State<'_, Requests>,
    request: Request,
) -> Result<String, Error> {
    if window.label() != "manager" && !window.label().starts_with("poffo-bubble-") {
        return Err(Error::DesktopOnly);
    }
    if request.id.is_empty() || request.id.len() > 64 {
        return Err(Error::InvalidRequest);
    }
    let key = (window.label().to_owned(), request.id);
    let cancelled = requests.begin(&key)?;
    let result = tokio::select! {
        _ = cancelled => Err(Error::Cancelled),
        result = runtime::transcribe(window.app_handle(), request.model, request.vad, &request.audio) => result,
    };
    requests.finish(&key);
    result
}

#[tauri::command]
pub fn cancel_local_transcription(
    window: WebviewWindow,
    requests: State<'_, Requests>,
    id: String,
) {
    requests.cancel((window.label().to_owned(), id));
}
