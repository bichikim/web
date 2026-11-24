mod client;
mod generation;
#[cfg(test)]
mod tests;

use client::Client;
use serde::{Deserialize, Serialize};
use serde_json::json;
use std::{collections::HashMap, sync::Mutex, time::Duration};
use tauri::{State, WebviewWindow};
use tokio::sync::oneshot;

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub enum Error {
    InvalidRequest,
    DesktopOnly,
    LoginRequired,
    ModelUnavailable,
    Cancelled,
    Unavailable,
}

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(rename_all = "lowercase")]
pub enum Role {
    User,
    Assistant,
}
#[derive(Clone, Debug, Deserialize, Serialize)]
pub struct Message {
    role: Role,
    content: String,
}
#[derive(Deserialize)]
pub struct Request {
    id: String,
    model: Option<String>,
    messages: Vec<Message>,
}
#[derive(Debug, Serialize)]
pub struct Model {
    id: String,
    name: String,
    default: bool,
}

type Key = (String, String);
#[derive(Default)]
pub struct Requests(Mutex<HashMap<Key, Option<oneshot::Sender<()>>>>);
impl Requests {
    fn begin(&self, key: &Key) -> Result<oneshot::Receiver<()>, Error> {
        let mut entries = self.0.lock().map_err(|_| Error::Unavailable)?;
        if matches!(entries.get(key), Some(None)) {
            entries.remove(key);
            return Err(Error::Cancelled);
        }
        if entries
            .iter()
            .any(|((owner, _), cancel)| owner == &key.0 && cancel.is_some())
        {
            return Err(Error::Unavailable);
        }
        let (cancel, cancelled) = oneshot::channel();
        entries.insert(key.clone(), Some(cancel));
        Ok(cancelled)
    }
    fn cancel(&self, key: Key) {
        if let Ok(mut entries) = self.0.lock() {
            if matches!(entries.remove(&key), Some(Some(_))) {
                return;
            }
            if entries
                .iter()
                .filter(|((owner, _), cancel)| owner == &key.0 && cancel.is_none())
                .count()
                >= 32
            {
                entries.retain(|(owner, _), cancel| owner != &key.0 || cancel.is_some());
            }
            entries.insert(key, None);
        }
    }
    pub fn remove(&self, owner: &str) {
        if let Ok(mut entries) = self.0.lock() {
            entries.retain(|(window, _), _| window != owner);
        }
    }
}

fn permitted(window: &WebviewWindow) -> Result<(), Error> {
    if window.label() == "manager" || window.label().starts_with("poffo-bubble-") {
        Ok(())
    } else {
        Err(Error::DesktopOnly)
    }
}
fn validate(request: &Request) -> Result<(), Error> {
    if uuid::Uuid::parse_str(&request.id).is_err()
        || request.messages.is_empty()
        || request.messages.len() > 13
        || request.messages.iter().any(|message| {
            message.content.trim().is_empty() || message.content.chars().count() > 8192
        })
        || request
            .messages
            .iter()
            .map(|message| message.content.len())
            .sum::<usize>()
            > 262144
        || !matches!(
            request.messages.last().map(|message| &message.role),
            Some(Role::User)
        )
        || request
            .model
            .as_ref()
            .is_some_and(|model| model.trim().is_empty() || model.len() > 128)
    {
        return Err(Error::InvalidRequest);
    }
    Ok(())
}

async fn models(client: &mut Client) -> Result<Vec<Model>, Error> {
    let account = client
        .call("account/read", json!({"refreshToken":false}))
        .await?;
    if account["account"].is_null() {
        return Err(Error::LoginRequired);
    }
    let mut cursor = serde_json::Value::Null;
    let mut entries = Vec::new();
    let mut cursors = std::collections::HashSet::new();
    loop {
        let reply = client
            .call(
                "model/list",
                json!({"limit":100,"includeHidden":false,"cursor":cursor}),
            )
            .await?;
        let data = reply["data"].as_array().ok_or(Error::Unavailable)?;
        entries.extend(
            data.iter()
                .filter(|model| model["hidden"] != true)
                .filter_map(|model| {
                    Some(Model {
                        id: model["model"].as_str()?.to_owned(),
                        name: model["displayName"].as_str()?.to_owned(),
                        default: model["isDefault"].as_bool().unwrap_or(false),
                    })
                }),
        );
        cursor = reply["nextCursor"].clone();
        let Some(next) = cursor.as_str() else {
            return Ok(entries);
        };
        if !cursors.insert(next.to_owned()) {
            return Err(Error::Unavailable);
        }
    }
}

#[tauri::command]
pub async fn list_codex_conversation_models(window: WebviewWindow) -> Result<Vec<Model>, Error> {
    permitted(&window)?;
    let mut client = Client::connect().await?;
    models(&mut client).await
}

#[tauri::command]
pub async fn generate_codex_conversation(
    window: WebviewWindow,
    requests: State<'_, Requests>,
    request: Request,
) -> Result<String, Error> {
    permitted(&window)?;
    validate(&request)?;
    let key = (window.label().to_owned(), request.id.clone());
    let cancelled = requests.begin(&key)?;
    let result = tokio::select! {
        biased;
        _ = cancelled => Err(Error::Cancelled),
        value = tokio::time::timeout(Duration::from_secs(180), generation::generate(&request)) => value.unwrap_or(Err(Error::Unavailable)),
    };
    if let Ok(mut entries) = requests.0.lock() {
        entries.remove(&key);
    }
    result
}

#[tauri::command]
pub fn cancel_codex_conversation(
    window: WebviewWindow,
    requests: State<'_, Requests>,
    id: String,
) -> Result<(), Error> {
    permitted(&window)?;
    if uuid::Uuid::parse_str(&id).is_err() {
        return Err(Error::InvalidRequest);
    }
    requests.cancel((window.label().to_owned(), id));
    Ok(())
}
