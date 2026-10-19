use super::preferences::selected_voice;
use super::{VoiceError, VoiceRequests, credentials, credentials_path, permitted, validate};
use crate::codex::app_server::Client;
use serde::Serialize;
use serde_json::json;
use std::{
    collections::HashMap,
    sync::{
        Arc, Mutex,
        atomic::{AtomicBool, Ordering},
    },
};
use tauri::{State, WebviewWindow, ipc::Channel};

struct Call {
    client: Client,
    thread: String,
    identifier: String,
}
impl Call {
    fn create() -> Result<Self, VoiceError> {
        let mut client =
            Client::connect_voice(&credentials_path()?).map_err(|_| VoiceError::LiveSetup)?;
        let reply = client
            .call(
                1,
                "thread/start",
                json!({
                    "ephemeral":true,"baseInstructions":"","developerInstructions":"",
                    "environments":[],"approvalPolicy":"never","sandbox":"read-only"
                }),
            )
            .map_err(|_| VoiceError::LiveSetup)?;
        let thread = reply["thread"]["id"]
            .as_str()
            .ok_or(VoiceError::Unavailable)?
            .to_string();
        Ok(Self {
            client,
            thread,
            identifier: String::new(),
        })
    }
}

struct Entry {
    cancelled: Arc<AtomicBool>,
    call: Option<Arc<Mutex<Call>>>,
}
#[derive(Default)]
pub(super) struct Sessions(Mutex<HashMap<(String, String), Entry>>);
impl Sessions {
    pub(super) fn remove(&self, owner: &str) {
        if let Ok(mut entries) = self.0.lock() {
            entries.retain(|(window, _), entry| {
                if window == owner {
                    entry.cancelled.store(true, Ordering::Release);
                    false
                } else {
                    true
                }
            });
        }
    }
    fn close(&self, key: &(String, String)) {
        if let Ok(mut entries) = self.0.lock()
            && let Some(entry) = entries.remove(key)
        {
            entry.cancelled.store(true, Ordering::Release);
        }
    }
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Answer {
    sdp: String,
}

async fn create_call(
    state: &VoiceRequests,
    offer: &str,
    cancelled: &AtomicBool,
    text: &str,
    language: &str,
) -> Result<(String, Arc<Mutex<Call>>), VoiceError> {
    let headers =
        credentials(&std::fs::read(credentials_path()?).map_err(|_| VoiceError::LoginRequired)?)?;
    let voice = selected_voice(
        state
            .client()?
            .get("https://chatgpt.com/backend-api/settings/user")
            .headers(headers.clone()),
    )
    .await?;
    if cancelled.load(Ordering::Acquire) {
        return Err(VoiceError::Cancelled);
    }
    let call = tauri::async_runtime::spawn_blocking(Call::create)
        .await
        .map_err(|_| VoiceError::Unavailable)??;
    if cancelled.load(Ordering::Acquire) {
        return Err(VoiceError::Cancelled);
    }
    let response = state.client()?.post("https://chatgpt.com/backend-api/wham/realtime/calls?intent=quicksilver&architecture=avas")
        .headers(headers)
        .header("OpenAI-Alpha","quicksilver=v2")
        .header("x-openai-web-frontend","codex_webview")
        .header("x-openai-codex-window-type","electron")
        .header("Thread-Id",&call.thread)
        .json(&json!({"sdp":offer,"session":{
            "audio":{"output":{"voice":voice}},"delegation":{"type":"client"},
            "initial_items":[{"type":"message","role":"developer","content":[{
                "type":"input_text","text":startup_text(text,language)
            }]}],"model":"gpt-live-1-codex",
            "instructions":"You are a voice reading assistant. When the user requests reading, speak only the exact supplied developer text. Do not delegate, invoke tools, or start tasks. Do not add a greeting or extra words."
        }})).send().await.map_err(|_| VoiceError::Network)?;
    match response.status().as_u16() {
        201 => (),
        401 | 403 => return Err(VoiceError::LoginRequired),
        429 => return Err(VoiceError::RateLimited),
        _ => return Err(VoiceError::Unavailable),
    }
    let location = response
        .headers()
        .get(reqwest::header::LOCATION)
        .and_then(|value| value.to_str().ok())
        .ok_or(VoiceError::Unavailable)?;
    let identifier = location
        .split('?')
        .next()
        .unwrap_or("")
        .rsplit('/')
        .next()
        .filter(|value| value.starts_with("rtc_"))
        .ok_or(VoiceError::Unavailable)?
        .to_string();
    if response
        .content_length()
        .is_some_and(|length| length > 262144)
    {
        return Err(VoiceError::Unavailable);
    }
    let sdp = response.text().await.map_err(|_| VoiceError::Network)?;
    if sdp.len() > 262144 || !sdp.starts_with("v=0") {
        return Err(VoiceError::Unavailable);
    }
    let mut call = call;
    call.identifier = identifier;
    Ok((sdp, Arc::new(Mutex::new(call))))
}

#[tauri::command]
pub async fn attach_codex_live_voice(
    window: WebviewWindow,
    state: State<'_, VoiceRequests>,
    request_id: String,
) -> Result<(), VoiceError> {
    permitted(&window)?;
    let call = state
        .live
        .0
        .lock()
        .map_err(|_| VoiceError::Unavailable)?
        .get(&(window.label().to_string(), request_id))
        .and_then(|entry| entry.call.clone())
        .ok_or(VoiceError::Cancelled)?;
    tauri::async_runtime::spawn_blocking(move || {
        let mut call = call.lock().map_err(|_| VoiceError::Unavailable)?;
        let params = json!({
            "threadId":call.thread,
            "outputModality":"audio","version":"v3","includeStartupContext":false,
            "flushTranscriptTailOnSessionEnd":false,"clientManagedHandoffs":true,
            "transport":{"type":"existingCall","callId":call.identifier}
        });
        call.client
            .call(2, "thread/realtime/start", params)
            .map_err(|_| VoiceError::LiveAttach)?;
        call.client
            .wait_realtime_ready()
            .map_err(|_| VoiceError::LiveAttach)?;
        Ok(())
    })
    .await
    .map_err(|_| VoiceError::Unavailable)?
}

#[tauri::command]
pub async fn start_codex_live_voice(
    window: WebviewWindow,
    state: State<'_, VoiceRequests>,
    request_id: String,
    offer: String,
    text: String,
    language: String,
    started: Channel<()>,
) -> Result<Answer, VoiceError> {
    permitted(&window)?;
    validate(&text, &language)?;
    if uuid::Uuid::parse_str(&request_id).is_err()
        || !offer.starts_with("v=0")
        || offer.len() > 262144
    {
        return Err(VoiceError::InvalidRequest);
    }
    let key = (window.label().to_string(), request_id);
    let cancelled = Arc::new(AtomicBool::new(false));
    {
        let mut entries = state.live.0.lock().map_err(|_| VoiceError::Unavailable)?;
        if entries.contains_key(&key)
            || entries
                .keys()
                .filter(|(owner, _)| owner == window.label())
                .count()
                >= 2
        {
            return Err(VoiceError::Unavailable);
        }
        entries.insert(
            key.clone(),
            Entry {
                cancelled: cancelled.clone(),
                call: None,
            },
        );
    }
    let result = async {
        started.send(()).map_err(|_| VoiceError::Cancelled)?;
        let (sdp, call) = create_call(&state, &offer, &cancelled, &text, &language).await?;
        let mut entries = state.live.0.lock().map_err(|_| VoiceError::Unavailable)?;
        let entry = entries
            .get_mut(&key)
            .filter(|_| !cancelled.load(Ordering::Acquire))
            .ok_or(VoiceError::Cancelled)?;
        entry.call = Some(call);
        Ok(Answer { sdp })
    }
    .await;
    if result.is_err() {
        state.live.close(&key);
    }
    result
}

#[tauri::command]
pub fn close_codex_live_voice(
    window: WebviewWindow,
    state: State<'_, VoiceRequests>,
    request_id: String,
) -> Result<(), VoiceError> {
    permitted(&window)?;
    state.live.close(&(window.label().to_string(), request_id));
    Ok(())
}

fn startup_text(text: &str, language: &str) -> String {
    let language = match language {
        "ko" => "Korean",
        "en" => "English",
        "es" => "Spanish",
        "pt" => "Portuguese",
        "fr" => "French",
        _ => "the original language of the supplied text",
    };
    format!(
        "Wait for a user request to read aloud. When requested, read only this exact text in {language}, without any extra words: {text} Do not speak until the user asks."
    )
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn closing_a_session_or_window_cancels_only_owned_work() {
        let sessions = Sessions::default();
        let first = Arc::new(AtomicBool::new(false));
        let second = Arc::new(AtomicBool::new(false));
        let other = Arc::new(AtomicBool::new(false));
        for (owner, id, cancelled) in [
            ("first", "1", first.clone()),
            ("first", "2", second.clone()),
            ("other", "1", other.clone()),
        ] {
            sessions.0.lock().unwrap().insert(
                (owner.into(), id.into()),
                Entry {
                    cancelled,
                    call: None,
                },
            );
        }
        sessions.close(&("first".into(), "1".into()));
        assert!(first.load(Ordering::Acquire));
        assert!(!second.load(Ordering::Acquire));
        assert!(!other.load(Ordering::Acquire));
        sessions.remove("first");
        assert!(second.load(Ordering::Acquire));
        assert!(!other.load(Ordering::Acquire));
        assert_eq!(sessions.0.lock().unwrap().len(), 1);
    }
}
