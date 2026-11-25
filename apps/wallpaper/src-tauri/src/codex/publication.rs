use super::{Bridge, Runtime, Snapshot, bubble, signals};
use tauri::{AppHandle, Emitter, Manager};

const EVENT: &str = "poffo-codex-state";

pub(super) fn snapshot(runtime: &Runtime) -> Snapshot {
    Snapshot {
        registered: runtime.registered,
        received: !runtime.recent.is_empty(),
        activity: runtime.activities.current(),
        recent: runtime.recent.clone(),
        sessions: runtime
            .activities
            .sessions()
            .into_iter()
            .map(|mut activity| {
                if runtime.questions.contains_session(&activity.session_id) {
                    activity.phase = "question".into();
                    activity.text = "질문에 답해 주세요.".into();
                    activity.tool = None;
                }
                activity
            })
            .collect(),
        approvals: runtime.approvals.list(),
        approval_enabled: runtime.approval_enabled,
        questions: runtime.questions.list(),
        questions_enabled: runtime.questions_enabled,
    }
}

pub(super) fn widget_snapshot(runtime: &Runtime, widget: &str) -> Snapshot {
    let mut value = snapshot(runtime);
    value
        .sessions
        .retain(|item| runtime.visibility.visible(widget, item));
    value
}

pub(super) fn publish_widget_signals(app: &AppHandle, id: &str, signals: &signals::Signals) {
    let event = signals::event(id);
    let _ = app.emit_to("manager", &event, signals);
    let _ = app.emit_to(format!("poffo-widget-{id}"), &event, signals);
}

pub(super) fn publish(app: &AppHandle) {
    let bridge = app.state::<Bridge>();
    let Ok(mut runtime) = bridge.0.lock() else {
        return;
    };
    let visible = runtime
        .activities
        .sessions()
        .into_iter()
        .filter(|activity| {
            runtime.widgets.iter().any(|(id, speech)| {
                speech.codex_visible() && runtime.visibility.visible(id, activity)
            })
        })
        .map(|activity| activity.session_id)
        .collect();
    runtime.approvals.retain(&visible);
    runtime.questions.retain(&visible);
    let snapshot = snapshot(&runtime);
    let widgets: Vec<_> = runtime
        .widgets
        .iter()
        .map(|(id, speech)| {
            (
                id.clone(),
                speech.clone(),
                widget_snapshot(&runtime, id),
                signals::for_widget(&runtime, id),
            )
        })
        .collect();
    drop(runtime);
    let _ = app.emit_to("manager", EVENT, &snapshot);
    for (id, speech, snapshot, signals) in widgets {
        publish_widget_signals(app, &id, &signals);
        if let Err(error) = bubble::synchronize(app, &id, &speech) {
            eprintln!("Poffo speech unavailable: {error}");
            if let Ok(mut runtime) = bridge.0.lock() {
                runtime.approvals.clear();
                runtime.questions.clear();
            }
        }
        let _ = app.emit_to(format!("poffo-bubble-{id}"), EVENT, &snapshot);
    }
}
