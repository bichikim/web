use super::{AppHandle, Bridge, Manager, Runtime, Webview};
use std::io;
use std::process::{Command, Stdio};

fn thread_url(session: &str) -> Result<String, String> {
    let id = uuid::Uuid::parse_str(session).map_err(|_| "Invalid Codex chat")?;
    Ok(format!("codex://threads/{id}"))
}

fn opener(url: &str) -> Command {
    #[cfg(target_os = "macos")]
    let mut command = Command::new("/usr/bin/open");
    #[cfg(target_os = "windows")]
    let mut command = {
        let mut command = Command::new("rundll32.exe");
        command.arg("url.dll,FileProtocolHandler");
        command
    };
    #[cfg(not(any(target_os = "macos", target_os = "windows")))]
    let mut command = Command::new("xdg-open");
    command
        .arg(url)
        .stdin(Stdio::null())
        .stdout(Stdio::null())
        .stderr(Stdio::null());
    command
}

fn authorized_url(runtime: &Runtime, caller: &str, session: &str) -> Result<String, String> {
    let url = thread_url(session)?;
    let widget = caller
        .strip_prefix("poffo-bubble-")
        .ok_or("Only speech windows can open Codex chats")?;
    let visible = runtime.activities.sessions().iter().any(|activity| {
        activity.session_id == session && runtime.visibility.visible(widget, activity)
    });
    if !visible
        || !runtime
            .widgets
            .get(widget)
            .is_some_and(|speech| speech.enabled)
    {
        return Err("Codex chat is unavailable in this speech window".into());
    }
    Ok(url)
}

fn launch_chat(url: &str, run: impl FnOnce(Command) -> io::Result<bool>) -> Result<(), String> {
    match run(opener(url)) {
        Ok(true) => Ok(()),
        Ok(false) => Err("Could not open Codex chat".into()),
        Err(error) => Err(error.to_string()),
    }
}

#[tauri::command]
pub async fn open_codex_chat(
    app: AppHandle,
    caller: Webview,
    session_id: String,
) -> Result<(), String> {
    let url = {
        let bridge = app.state::<Bridge>();
        let runtime = bridge.0.lock().map_err(|error| error.to_string())?;
        authorized_url(&runtime, caller.label(), &session_id)?
    };
    tauri::async_runtime::spawn_blocking(move || {
        launch_chat(&url, |mut command| {
            command.status().map(|status| status.success())
        })
    })
    .await
    .map_err(|error| error.to_string())?
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::codex::{activity::HookEvent, bubble::Speech};

    const SESSION: &str = "01a17820-d516-7200-8bed-0f257d1ce1ee";
    const CALLER: &str = "poffo-bubble-widget";

    fn runtime() -> Runtime {
        let mut runtime = Runtime::default();
        runtime.widgets.insert("widget".into(), Speech::default());
        runtime.activities.receive(&HookEvent {
            hook_event_name: "SessionStart".into(),
            session_id: SESSION.into(),
            turn_id: None,
            tool_name: None,
            response: None,
            tool_failed: false,
            approval: None,
            emitted_at: 1,
        });
        runtime
    }

    #[test]
    fn permits_a_visible_chat_in_an_enabled_speech_window() {
        assert_eq!(
            authorized_url(&runtime(), CALLER, SESSION).unwrap(),
            format!("codex://threads/{SESSION}")
        );
    }

    #[test]
    fn rejects_callers_outside_speech_windows() {
        assert_eq!(
            authorized_url(&runtime(), "manager", SESSION).unwrap_err(),
            "Only speech windows can open Codex chats"
        );
    }

    #[test]
    fn rejects_an_unregistered_speech_window() {
        let mut runtime = runtime();
        runtime.widgets.clear();
        assert!(authorized_url(&runtime, CALLER, SESSION).is_err());
    }

    #[test]
    fn rejects_a_disabled_speech_window() {
        let mut runtime = runtime();
        runtime.widgets.get_mut("widget").unwrap().enabled = false;
        assert!(authorized_url(&runtime, CALLER, SESSION).is_err());
    }

    #[test]
    fn rejects_a_chat_missing_from_activities() {
        assert!(
            authorized_url(&runtime(), CALLER, "01a17820-d516-7200-8bed-0f257d1ce1ef").is_err()
        );
    }

    #[test]
    fn rejects_a_chat_hidden_in_the_callers_window() {
        let mut runtime = runtime();
        let activity = runtime.activities.sessions().pop().unwrap();
        runtime.visibility.hide("widget", &activity);
        assert!(authorized_url(&runtime, CALLER, SESSION).is_err());
    }

    #[test]
    fn permits_a_chat_hidden_only_in_another_window() {
        let mut runtime = runtime();
        let activity = runtime.activities.sessions().pop().unwrap();
        runtime.visibility.hide("other-widget", &activity);
        assert!(authorized_url(&runtime, CALLER, SESSION).is_ok());
    }

    #[test]
    fn launches_the_authorized_link_through_the_supplied_runner() {
        let url = authorized_url(&runtime(), CALLER, SESSION).unwrap();
        let mut calls = 0;
        let result = launch_chat(&url, |command| {
            calls += 1;
            assert_eq!(
                command.get_args().last().unwrap(),
                std::ffi::OsStr::new(&url)
            );
            Ok(true)
        });
        assert_eq!(result, Ok(()));
        assert_eq!(calls, 1);
    }

    #[test]
    fn reports_an_unsuccessful_opener_exit() {
        assert_eq!(
            launch_chat("codex://threads/test", |_| Ok(false)).unwrap_err(),
            "Could not open Codex chat"
        );
    }

    #[test]
    fn reports_an_opener_io_failure() {
        let result = launch_chat("codex://threads/test", |_| {
            Err(io::Error::new(io::ErrorKind::NotFound, "opener missing"))
        });
        assert_eq!(result.unwrap_err(), "opener missing");
    }

    #[test]
    fn creates_only_a_canonical_chat_link() {
        let session = "01a17820-d516-7200-8bed-0f257d1ce1ee";
        assert_eq!(
            thread_url(session).unwrap(),
            format!("codex://threads/{session}")
        );
        for invalid in [
            "",
            "other",
            "https://example.com",
            "--args",
            "../settings",
            "codex://threads/new?prompt=run",
        ] {
            assert!(thread_url(invalid).is_err());
        }
    }

    #[test]
    fn passes_the_chat_link_as_one_opener_argument() {
        let url = thread_url("01a17820-d516-7200-8bed-0f257d1ce1ee").unwrap();
        let command = opener(&url);
        let arguments: Vec<_> = command.get_args().collect();
        assert_eq!(arguments.last().unwrap(), &std::ffi::OsStr::new(&url));
        #[cfg(target_os = "macos")]
        assert_eq!(arguments.len(), 1);
    }
}
