use super::{Bridge, snapshot};
use serde::Serialize;
use tauri::{AppHandle, Manager, Webview};

pub const EVENT: &str = "poffo-agent-state";
#[derive(Clone, Debug, Default, Serialize)]
pub struct Signals {
    connected: bool,
    working: bool,
    tool: bool,
    question: bool,
    approval: bool,
    response: bool,
    interrupted: bool,
    error: bool,
}
pub fn from_snapshot(snapshot: &super::Snapshot) -> Signals {
    if !snapshot.registered {
        return Signals::default();
    }
    let any = |phase: &str| {
        snapshot
            .sessions
            .iter()
            .any(|activity| activity.phase == phase)
    };
    Signals {
        connected: true,
        working: any("working"),
        question: any("question"),
        approval: any("approval"),
        response: any("response"),
        interrupted: any("interrupted"),
        tool: snapshot
            .sessions
            .iter()
            .any(|activity| activity.tool_active),
        error: snapshot
            .sessions
            .iter()
            .any(|activity| activity.tool_failed),
    }
}

#[tauri::command]
pub fn poffo_agent_state(app: AppHandle, caller: Webview) -> Result<Signals, String> {
    let bridge = app.state::<Bridge>();
    let runtime = bridge.0.lock().map_err(|error| error.to_string())?;
    if caller.label() != "manager"
        && !caller
            .label()
            .strip_prefix("poffo-widget-")
            .is_some_and(|id| runtime.widgets.contains_key(id))
    {
        return Err("Unsupported agent state surface".into());
    }
    Ok(from_snapshot(&snapshot(&runtime)))
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::codex::{Runtime, activity::HookEvent};
    use serde_json::json;
    #[test]
    fn aggregates_parallel_chats_and_clears_every_signal_on_disconnect() {
        let mut runtime = Runtime {
            registered: true,
            ..Default::default()
        };
        for (name, session, failed) in [
            ("PreToolUse", "working", false),
            ("PermissionRequest", "approval", false),
            ("PostToolUse", "error", true),
        ] {
            let event: HookEvent = serde_json::from_value(json!({"hook_event_name":name,"session_id":session,"turn_id":"turn","emitted_at":1,"tool_failed":failed})).unwrap();
            runtime.activities.receive(&event);
        }
        let value = serde_json::to_value(from_snapshot(&snapshot(&runtime))).unwrap();
        assert_eq!(value["working"], true);
        assert_eq!(value["approval"], true);
        assert_eq!(value["tool"], true);
        assert_eq!(value["error"], true);
        runtime.registered = false;
        let value = serde_json::to_value(from_snapshot(&snapshot(&runtime))).unwrap();
        assert!(
            value
                .as_object()
                .unwrap()
                .values()
                .all(|value| value == &json!(false))
        );
    }
}
