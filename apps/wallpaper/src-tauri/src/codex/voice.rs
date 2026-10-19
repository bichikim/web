use reqwest::{Client, StatusCode, header, redirect::Policy};
use serde::{Deserialize, Serialize};
use std::{
    collections::HashMap,
    fs,
    path::PathBuf,
    sync::{Mutex, OnceLock},
    time::Duration,
};
use tauri::{
    State, WebviewWindow,
    ipc::{Channel, Response},
};
use tokio::sync::oneshot;

const ENDPOINT: &str = "https://chatgpt.com/backend-api/pronunciation/synthesize?format=mp3";
const MAX_AUDIO_BYTES: usize = 8 * 1024 * 1024;

#[cfg(test)]
#[path = "voice/integration.rs"]
mod integration;

pub mod live;
mod preferences;

#[derive(Clone, Copy, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub enum VoiceError {
    Cancelled,
    DesktopOnly,
    InvalidRequest,
    LoginRequired,
    VoiceSettings,
    LiveSetup,
    LiveAttach,
    Network,
    RateLimited,
    Unavailable,
}

#[derive(Deserialize)]
struct Credentials {
    tokens: Tokens,
}
#[derive(Deserialize)]
struct Tokens {
    access_token: String,
    account_id: Option<String>,
}

fn credentials_path() -> Result<PathBuf, VoiceError> {
    let home = std::env::var_os("CODEX_HOME")
        .map(PathBuf::from)
        .or_else(|| {
            std::env::var_os(if cfg!(windows) { "USERPROFILE" } else { "HOME" })
                .map(|home| PathBuf::from(home).join(".codex"))
        });
    Ok(home.ok_or(VoiceError::LoginRequired)?.join("auth.json"))
}

fn credentials(bytes: &[u8]) -> Result<header::HeaderMap, VoiceError> {
    let account: Credentials =
        serde_json::from_slice(bytes).map_err(|_| VoiceError::LoginRequired)?;
    if account.tokens.access_token.trim().is_empty() {
        return Err(VoiceError::LoginRequired);
    }
    let mut authorization =
        header::HeaderValue::from_str(&format!("Bearer {}", account.tokens.access_token))
            .map_err(|_| VoiceError::LoginRequired)?;
    authorization.set_sensitive(true);
    let mut headers = header::HeaderMap::new();
    headers.insert(header::AUTHORIZATION, authorization);
    if let Some(account_id) = account.tokens.account_id {
        let mut value =
            header::HeaderValue::from_str(&account_id).map_err(|_| VoiceError::LoginRequired)?;
        value.set_sensitive(true);
        headers.insert("ChatGPT-Account-Id", value);
    }
    Ok(headers)
}

fn validate(text: &str, language: &str) -> Result<(), VoiceError> {
    if text.trim().is_empty()
        || text.chars().count() > 2048
        || language.len() != 2
        || !language
            .bytes()
            .all(|character| character.is_ascii_lowercase())
    {
        return Err(VoiceError::InvalidRequest);
    }
    Ok(())
}

fn response_status(status: StatusCode) -> Result<(), VoiceError> {
    match status {
        StatusCode::OK => Ok(()),
        StatusCode::UNAUTHORIZED => Err(VoiceError::LoginRequired),
        StatusCode::TOO_MANY_REQUESTS => Err(VoiceError::RateLimited),
        _ => Err(VoiceError::Unavailable),
    }
}

#[derive(Default)]
pub struct VoiceRequests {
    pending: Mutex<HashMap<(String, String), oneshot::Sender<()>>>,
    client: OnceLock<Client>,
    live: live::Sessions,
}
impl VoiceRequests {
    fn client(&self) -> Result<&Client, VoiceError> {
        if let Some(client) = self.client.get() {
            return Ok(client);
        }
        let client = Client::builder()
            .redirect(Policy::none())
            .timeout(Duration::from_secs(60))
            .user_agent("Poffo-Readout/0.1")
            .build()
            .map_err(|_| VoiceError::Network)?;
        let _ = self.client.set(client);
        self.client.get().ok_or(VoiceError::Network)
    }

    pub fn remove(&self, owner: &str) {
        self.live.remove(owner);
        if let Ok(mut pending) = self.pending.lock() {
            pending.retain(|(window, _), _| window != owner);
        }
    }
}

fn permitted(window: &WebviewWindow) -> Result<(), VoiceError> {
    if window.label() == "manager" || window.label().starts_with("poffo-bubble-") {
        Ok(())
    } else {
        Err(VoiceError::DesktopOnly)
    }
}

async fn synthesize(client: &Client, text: &str, language: &str) -> Result<Vec<u8>, VoiceError> {
    let path = credentials_path()?;
    let account = fs::read(path).map_err(|_| VoiceError::LoginRequired)?;
    let headers = credentials(&account)?;
    let mut response = client
        .post(ENDPOINT)
        .headers(headers)
        .json(&serde_json::json!({
            "text":text,
            "pronunciation_language":(language != "na").then_some(language),
            "source":"translation",
        }))
        .send()
        .await
        .map_err(|_| VoiceError::Network)?;
    response_status(response.status())?;
    if response
        .headers()
        .get(header::CONTENT_TYPE)
        .and_then(|value| value.to_str().ok())
        .is_none_or(|mime| mime.split(';').next() != Some("audio/mpeg"))
    {
        return Err(VoiceError::Unavailable);
    }
    let mut audio = Vec::new();
    while let Some(chunk) = response.chunk().await.map_err(|_| VoiceError::Network)? {
        if audio.len() + chunk.len() > MAX_AUDIO_BYTES {
            return Err(VoiceError::Unavailable);
        }
        audio.extend_from_slice(&chunk);
    }
    if audio.is_empty() {
        return Err(VoiceError::Unavailable);
    }
    Ok(audio)
}

#[tauri::command]
pub fn codex_voice_login_status(window: WebviewWindow) -> Result<(), VoiceError> {
    permitted(&window)?;
    let account = fs::read(credentials_path()?).map_err(|_| VoiceError::LoginRequired)?;
    credentials(&account).map(|_| ())
}

#[tauri::command]
pub async fn synthesize_codex_voice(
    window: WebviewWindow,
    state: State<'_, VoiceRequests>,
    request_id: String,
    text: String,
    language: String,
    started: Channel<()>,
) -> Result<Response, VoiceError> {
    permitted(&window)?;
    validate(&text, &language)?;
    if uuid::Uuid::parse_str(&request_id).is_err() {
        return Err(VoiceError::InvalidRequest);
    }
    let key = (window.label().to_string(), request_id);
    let (cancel, cancelled) = oneshot::channel();
    {
        let mut pending = state.pending.lock().map_err(|_| VoiceError::Unavailable)?;
        if pending.contains_key(&key)
            || pending
                .keys()
                .filter(|(owner, _)| owner == window.label())
                .count()
                >= 4
        {
            return Err(VoiceError::Unavailable);
        }
        pending.insert(key.clone(), cancel);
    }
    let result = async {
        started.send(()).map_err(|_| VoiceError::Cancelled)?;
        let client = state.client()?;
        tokio::select! {
            biased;
            _ = cancelled => Err(VoiceError::Cancelled),
            result = synthesize(client, &text, &language) => result.map(Response::new),
        }
    }
    .await;
    if let Ok(mut pending) = state.pending.lock() {
        pending.remove(&key);
    }
    result
}

#[tauri::command]
pub fn cancel_codex_voice(
    window: WebviewWindow,
    state: State<'_, VoiceRequests>,
    request_id: String,
) -> Result<(), VoiceError> {
    permitted(&window)?;
    if let Some(cancel) = state
        .pending
        .lock()
        .map_err(|_| VoiceError::Unavailable)?
        .remove(&(window.label().to_string(), request_id))
    {
        let _ = cancel.send(());
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn rejects_missing_credentials_and_redacts_authorization_debug_output() {
        assert!(credentials(br#"{}"#).is_err());
        assert!(credentials(br#"{"tokens":{"access_token":""}}"#).is_err());
        assert!(credentials(br#"{"tokens":{"access_token":"bad\r\nheader"}}"#).is_err());
        let headers = credentials(
            br#"{"tokens":{"access_token":"secret-fixture","account_id":"account-fixture"}}"#,
        )
        .unwrap();
        assert_eq!(headers[header::AUTHORIZATION], "Bearer secret-fixture");
        assert!(!format!("{headers:?}").contains("secret-fixture"));
        assert!(!format!("{headers:?}").contains("account-fixture"));
    }

    #[test]
    fn bounds_text_language_and_classifies_service_errors_without_exposing_response_bodies() {
        assert!(validate("읽어 주세요", "ko").is_ok());
        assert!(validate("Read this", "na").is_ok());
        assert!(validate("Read this", "de").is_ok());
        assert!(validate(" ", "ko").is_err());
        assert!(validate(&"a".repeat(2049), "en").is_err());
        assert!(validate("text", "../../other").is_err());
        assert!(response_status(StatusCode::OK).is_ok());
        assert!(matches!(
            response_status(StatusCode::UNAUTHORIZED),
            Err(VoiceError::LoginRequired)
        ));
        assert!(matches!(
            response_status(StatusCode::TOO_MANY_REQUESTS),
            Err(VoiceError::RateLimited)
        ));
        assert!(matches!(
            response_status(StatusCode::FOUND),
            Err(VoiceError::Unavailable)
        ));
    }

    #[test]
    fn window_cleanup_cancels_only_its_own_requests() {
        let state = VoiceRequests::default();
        let (first, mut cancelled) = oneshot::channel();
        let (other, mut retained) = oneshot::channel();
        state
            .pending
            .lock()
            .unwrap()
            .insert(("first".into(), "1".into()), first);
        state
            .pending
            .lock()
            .unwrap()
            .insert(("other".into(), "2".into()), other);
        state.remove("first");
        assert!(matches!(
            cancelled.try_recv(),
            Err(oneshot::error::TryRecvError::Closed)
        ));
        assert!(matches!(
            retained.try_recv(),
            Err(oneshot::error::TryRecvError::Empty)
        ));
    }
}
