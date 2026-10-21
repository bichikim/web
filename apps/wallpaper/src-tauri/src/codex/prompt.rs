use super::{AppHandle, Bridge, Manager, Webview, app_server};
use std::{
    collections::BTreeSet,
    process::{Command, Stdio},
    sync::{Arc, Mutex},
};

#[derive(Clone, Default)]
pub struct Delivery(Arc<Mutex<BTreeSet<String>>>);
struct Sending {
    state: Delivery,
    session: String,
}
impl Drop for Sending {
    fn drop(&mut self) {
        if let Ok(mut sessions) = self.state.0.lock() {
            sessions.remove(&self.session);
        }
    }
}
fn begin(state: Delivery, session: &str) -> Result<Sending, String> {
    if !state
        .0
        .lock()
        .map_err(|error| error.to_string())?
        .insert(session.into())
    {
        return Err("이미 전송 중입니다.".into());
    }
    Ok(Sending {
        state,
        session: session.into(),
    })
}
fn command(executable: &std::path::Path, session: &str, message: &str) -> Result<Command, String> {
    if uuid::Uuid::parse_str(session).is_err()
        || message.trim().is_empty()
        || message.len() > 16_000
    {
        return Err("Invalid Codex prompt".into());
    }
    let mut command = Command::new(executable);
    command
        .args(["queue", "--thread", session, "--message", message])
        .stdin(Stdio::null())
        .stdout(Stdio::null())
        .stderr(Stdio::null());
    Ok(command)
}

#[tauri::command]
pub async fn send_codex_prompt(
    app: AppHandle,
    caller: Webview,
    session_id: String,
    message: String,
) -> Result<(), String> {
    let widget = caller
        .label()
        .strip_prefix("poffo-bubble-")
        .ok_or("Only speech windows can send prompts")?;
    {
        let bridge = app.state::<Bridge>();
        let runtime = bridge.0.lock().map_err(|error| error.to_string())?;
        let visible = runtime.activities.sessions().iter().any(|activity| {
            activity.session_id == session_id
                && matches!(activity.phase.as_str(), "response" | "interrupted")
                && runtime.visibility.visible(widget, activity)
        });
        if !runtime.registered
            || !visible
            || !runtime
                .widgets
                .get(widget)
                .is_some_and(|speech| speech.enabled)
        {
            return Err("응답이 도착한 채팅에서 다시 시도해 주세요.".into());
        }
    }
    let sending = begin(app.state::<Delivery>().inner().clone(), &session_id)?;
    tauri::async_runtime::spawn_blocking(move || {
        let _sending = sending;
        let success = command(&app_server::executable()?, &session_id, &message)?
            .status()
            .map_err(|_| "Codex 전송 실패")?
            .success();
        if success {
            Ok(())
        } else {
            Err("Codex 전송 실패".into())
        }
    })
    .await
    .map_err(|error| error.to_string())?
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn keeps_the_message_in_one_argument_and_rejects_invalid_targets() {
        let session = uuid::Uuid::new_v4().to_string();
        let message = "quotes ' \" $(pwd)\n--thread other";
        let executable = std::path::Path::new("/codex");
        let value = command(executable, &session, message).unwrap();
        assert_eq!(
            value
                .get_args()
                .map(|arg| arg.to_str().unwrap())
                .collect::<Vec<_>>(),
            vec!["queue", "--thread", &session, "--message", message]
        );
        assert!(command(executable, "other", message).is_err());
        assert!(command(executable, &session, " ").is_err());
        assert!(command(executable, &session, &"x".repeat(16_001)).is_err());
    }
    #[test]
    fn allows_different_chats_but_only_one_pending_send_per_chat() {
        let state = Delivery::default();
        let first = begin(state.clone(), "one").unwrap();
        assert!(begin(state.clone(), "one").is_err());
        let _second = begin(state.clone(), "two").unwrap();
        drop(first);
        assert!(begin(state, "one").is_ok());
    }
}
