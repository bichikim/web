use super::Bridge;
use serde::Serialize;
use tauri::{AppHandle, Manager, Webview};

pub const EVENT: &str = "poffo-agent-state";
pub fn event(widget: &str) -> String {
    format!("{EVENT}:{widget}")
}
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

pub(super) fn for_widget(runtime: &super::Runtime, widget: &str) -> Signals {
    let Some(session) = runtime.foreground.get(widget) else {
        return Signals::default();
    };
    if !runtime
        .widgets
        .get(widget)
        .is_some_and(|speech| speech.enabled)
    {
        return Signals::default();
    }
    let mut value = super::widget_snapshot(runtime, widget);
    value
        .sessions
        .retain(|activity| activity.session_id == *session);
    if value.sessions.is_empty() {
        return Signals::default();
    }
    from_snapshot(&value)
}

#[tauri::command]
pub fn select_poffo_speech(
    app: AppHandle,
    caller: Webview,
    session_id: Option<String>,
) -> Result<(), String> {
    let id = caller
        .label()
        .strip_prefix("poffo-bubble-")
        .ok_or("Unsupported speech selection surface")?;
    let bridge = app.state::<Bridge>();
    let mut runtime = bridge.0.lock().map_err(|error| error.to_string())?;
    if !runtime.widgets.contains_key(id) {
        return Err("Unknown widget".into());
    }
    crate::microphone_shortcut::select(&app, caller.label());
    let selected = session_id.filter(|session| {
        super::widget_snapshot(&runtime, id)
            .sessions
            .iter()
            .any(|activity| activity.session_id == *session)
    });
    if runtime.foreground.get(id) == selected.as_ref() {
        return Ok(());
    }
    match selected {
        Some(session) => {
            runtime.foreground.insert(id.to_owned(), session);
        }
        None => {
            runtime.foreground.remove(id);
        }
    }
    drop(runtime);
    super::publish(&app);
    Ok(())
}

#[tauri::command]
pub fn poffo_agent_state(
    app: AppHandle,
    caller: Webview,
    widget_id: Option<String>,
) -> Result<Signals, String> {
    let bridge = app.state::<Bridge>();
    let runtime = bridge.0.lock().map_err(|error| error.to_string())?;
    let widget = if caller.label() == "manager" {
        widget_id.as_deref()
    } else {
        let id = caller
            .label()
            .strip_prefix("poffo-widget-")
            .ok_or("Unsupported agent state surface")?;
        if widget_id
            .as_deref()
            .is_some_and(|requested| requested != id)
        {
            return Err("Mismatched widget".into());
        }
        Some(id)
    };
    Ok(widget.map_or_else(Signals::default, |id| for_widget(&runtime, id)))
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::codex::{Runtime, activity::HookEvent, snapshot};
    use serde_json::json;
    #[test]
    fn follows_only_the_foreground_bubble_and_clears_when_hidden_or_unselected() {
        let mut runtime = Runtime {
            registered: true,
            ..Default::default()
        };
        runtime.widgets.insert("cat".into(), Default::default());
        for (name, session, failed) in [
            ("PreToolUse", "front", false),
            ("PostToolUse", "back", true),
        ] {
            let event: HookEvent = serde_json::from_value(json!({"hook_event_name":name,"session_id":session,"turn_id":"turn","emitted_at":1,"tool_failed":failed})).unwrap();
            runtime.activities.receive(&event);
        }
        runtime.foreground.insert("cat".into(), "front".into());
        runtime.widgets.insert("other".into(), Default::default());
        runtime.foreground.insert("other".into(), "back".into());
        let value = serde_json::to_value(for_widget(&runtime, "cat")).unwrap();
        assert_eq!(value["tool"], true);
        assert_eq!(value["error"], false);
        assert_eq!(
            serde_json::to_value(for_widget(&runtime, "other")).unwrap()["error"],
            true
        );
        runtime.foreground.insert("cat".into(), "back".into());
        assert_eq!(
            serde_json::to_value(for_widget(&runtime, "cat")).unwrap()["error"],
            true
        );
        runtime.foreground.remove("cat");
        assert_eq!(
            serde_json::to_value(for_widget(&runtime, "cat")).unwrap()["connected"],
            false
        );
        runtime.foreground.insert("cat".into(), "front".into());
        runtime.widgets.get_mut("cat").unwrap().enabled = false;
        assert_eq!(
            serde_json::to_value(for_widget(&runtime, "cat")).unwrap()["tool"],
            false
        );
    }
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
