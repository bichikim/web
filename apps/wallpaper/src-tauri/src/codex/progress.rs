use super::{Bridge, activity::HookEvent};
use std::collections::{BTreeMap, BTreeSet};
use tauri::{AppHandle, Manager};

#[derive(Default)]
pub struct Queries {
    pending: BTreeMap<String, String>,
    running: BTreeSet<String>,
}

impl Queries {
    fn enqueue(&mut self, session: &str, turn: &str) -> bool {
        self.pending.insert(session.into(), turn.into());
        self.running.insert(session.into())
    }

    fn take(&mut self, session: &str) -> Option<String> {
        let turn = self.pending.remove(session);
        if turn.is_none() {
            self.running.remove(session);
        }
        turn
    }
}

pub fn refresh(app: &AppHandle, event: &HookEvent) {
    if !matches!(event.hook_event_name.as_str(), "PreToolUse" | "PostToolUse") {
        return;
    }
    let Some(turn) = event.turn_id.as_deref() else {
        return;
    };
    let bridge = app.state::<Bridge>();
    let start = bridge.0.lock().is_ok_and(|mut runtime| {
        runtime.registered
            && runtime.widgets.values().any(|speech| speech.enabled)
            && runtime.progress.enqueue(&event.session_id, turn)
    });
    if start {
        let (app, session) = (app.clone(), event.session_id.clone());
        std::thread::spawn(move || run(&app, &session));
    }
}

fn run(app: &AppHandle, session: &str) {
    let bridge = app.state::<Bridge>();
    loop {
        let next = bridge.0.lock().ok().and_then(|mut runtime| {
            runtime.progress.take(session).map(|turn| {
                let current = runtime.registered && runtime.activities.current_turn(session, &turn);
                (turn, current)
            })
        });
        let Some((turn, current)) = next else {
            return;
        };
        if current && let Ok(Some(text)) = super::app_server::thread_progress(session, &turn) {
            let changed = bridge.0.lock().is_ok_and(|mut runtime| {
                runtime.registered && runtime.activities.progress(session, &turn, text)
            });
            if changed {
                let handle = app.clone();
                let _ = app.run_on_main_thread(move || super::publish(&handle));
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn coalesces_to_the_latest_turn_with_one_worker_per_chat() {
        let mut queries = Queries::default();
        assert!(queries.enqueue("one", "old"));
        assert!(!queries.enqueue("one", "new"));
        assert!(queries.enqueue("two", "other"));
        assert_eq!(queries.take("one").as_deref(), Some("new"));
        assert!(!queries.enqueue("one", "latest"));
        assert_eq!(queries.take("one").as_deref(), Some("latest"));
        assert!(queries.take("one").is_none());
        assert!(queries.enqueue("one", "next"));
        assert_eq!(queries.take("two").as_deref(), Some("other"));
    }
}
