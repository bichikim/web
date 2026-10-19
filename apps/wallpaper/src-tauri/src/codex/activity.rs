use serde::{Deserialize, Serialize};
use std::collections::{BTreeMap, BTreeSet};

#[derive(Clone, Debug, Deserialize, Serialize)]
pub struct HookEvent {
    pub hook_event_name: String,
    pub session_id: String,
    #[serde(default)]
    pub turn_id: Option<String>,
    #[serde(default)]
    pub tool_name: Option<String>,
    #[serde(default)]
    pub response: Option<String>,
    #[serde(default)]
    pub tool_failed: bool,
    #[serde(default)]
    pub approval: Option<super::approvals::Input>,
    pub emitted_at: u64,
}

#[derive(Clone, Debug, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Activity {
    pub tool_active: bool,
    pub tool_failed: bool,
    pub session_id: String,
    pub phase: String,
    pub text: String,
    pub tool: Option<String>,
    pub received_at: u64,
    pub notification_id: u64,
    pub response: Option<String>,
}

#[derive(Default)]
struct Session {
    active_tools: BTreeMap<String, usize>,
    failed_tools: BTreeSet<String>,
    turn: Option<String>,
    terminal: bool,
    progress: Option<String>,
    approvals: BTreeSet<String>,
    activity: Option<Activity>,
}

#[derive(Default)]
pub struct Activities {
    sessions: BTreeMap<String, Session>,
    ended: BTreeSet<(String, String)>,
    notification: u64,
}

impl Activities {
    pub fn progress(&mut self, session: &str, turn: &str, text: String) -> bool {
        if !self.current_turn(session, turn) {
            return false;
        }
        let value = self.sessions.get_mut(session).unwrap();
        value.progress = Some(text.clone());
        if let Some(activity) = value.activity.as_mut()
            && activity.phase == "working"
            && activity.text != text
        {
            activity.text = text;
            return true;
        }
        false
    }
    pub fn current_turn(&self, session: &str, turn: &str) -> bool {
        self.sessions
            .get(session)
            .is_some_and(|value| !value.terminal && value.turn.as_deref() == Some(turn))
    }
    pub fn question(&mut self, session: &str, turn: &str) {
        if !self.current_turn(session, turn) {
            return;
        }
        self.notification += 1;
        if let Some(activity) = self
            .sessions
            .get_mut(session)
            .and_then(|value| value.activity.as_mut())
        {
            activity.phase = "question".into();
            activity.text = "질문에 답해 주세요.".into();
            activity.tool = None;
            activity.notification_id = self.notification;
        }
    }
    pub fn question_ended(&mut self, session: &str, turn: &str) {
        if !self.current_turn(session, turn) {
            return;
        }
        if let Some(value) = self.sessions.get_mut(session)
            && let Some(activity) = value.activity.as_mut()
            && activity.phase == "question"
        {
            let (phase, text) = if value.approvals.is_empty() {
                ("working", "Codex가 작업하고 있어요.")
            } else {
                ("approval", "Codex에서 승인을 기다리고 있어요.")
            };
            activity.phase = phase.into();
            activity.text = if phase == "working" {
                value.progress.as_deref().unwrap_or(text).into()
            } else {
                text.into()
            };
        }
    }
    pub fn receive(&mut self, event: &HookEvent) -> bool {
        if event.hook_event_name == "SessionStart" && self.sessions.contains_key(&event.session_id)
        {
            return false;
        }
        let terminal = matches!(event.hook_event_name.as_str(), "Stop" | "Interrupt");
        if event.turn_id.as_ref().is_some_and(|turn| {
            self.ended
                .contains(&(event.session_id.clone(), turn.clone()))
        }) {
            return false;
        }
        if !self.sessions.contains_key(&event.session_id)
            && self.sessions.len() >= 32
            && let Some(oldest) = self
                .sessions
                .iter()
                .min_by_key(|(_, session)| session.activity.as_ref().map(|item| item.received_at))
                .map(|(id, _)| id.clone())
        {
            self.sessions.remove(&oldest);
        }
        let session = self.sessions.entry(event.session_id.clone()).or_default();
        let changed_turn = session.turn != event.turn_id;
        if session.terminal && !changed_turn {
            return false;
        }
        if changed_turn {
            session.turn = event.turn_id.clone();
            session.terminal = false;
            session.approvals.clear();
            session.failed_tools.clear();
            session.active_tools.clear();
            session.progress = None;
        }
        let tool = event.tool_name.clone().unwrap_or_default();
        match event.hook_event_name.as_str() {
            "PreToolUse" => *session.active_tools.entry(tool.clone()).or_default() += 1,
            "PostToolUse" => {
                if let Some(count) = session.active_tools.get_mut(&tool) {
                    *count = count.saturating_sub(1);
                }
            }
            "Stop" | "Interrupt" => session.active_tools.clear(),
            _ => {}
        }
        match event.hook_event_name.as_str() {
            "PostToolUse" if event.tool_failed => {
                session.failed_tools.insert(tool.clone());
            }
            "PostToolUse" => {
                session.failed_tools.remove(&tool);
            }
            "Stop" | "Interrupt" => session.failed_tools.clear(),
            _ => {}
        }
        let tool_failed = !session.failed_tools.is_empty();
        let phase = match event.hook_event_name.as_str() {
            "SessionStart" => "idle",
            "UserPromptSubmit" if !changed_turn && session.activity.is_some() => return false,
            "UserPromptSubmit" | "PreToolUse" => "working",
            "PermissionRequest" => {
                session.approvals.insert(tool.clone());
                "approval"
            }
            "PostToolUse" => {
                session.approvals.remove(&tool);
                "working"
            }
            "Stop" => "response",
            "Interrupt" => "interrupted",
            _ => return false,
        };
        session.terminal = terminal;
        if terminal {
            session.approvals.clear();
            if let Some(turn) = &event.turn_id {
                self.ended.insert((event.session_id.clone(), turn.clone()));
                while self.ended.len() > 128 {
                    self.ended.pop_first();
                }
            }
        }
        let phase = if session.approvals.is_empty() {
            phase
        } else {
            "approval"
        };
        let new_notification = changed_turn
            || session.activity.is_none()
            || terminal
            || event.hook_event_name == "PermissionRequest";
        if new_notification {
            self.notification += 1;
        }
        let notification_id = if new_notification {
            self.notification
        } else {
            session
                .activity
                .as_ref()
                .map_or(self.notification, |item| item.notification_id)
        };
        let text = match phase {
            "idle" => "Codex가 연결됐어요.",
            "approval" => "Codex에서 승인을 기다리고 있어요.",
            "response" => "Codex의 응답이 도착했어요.",
            "interrupted" => "Codex 작업이 중단됐어요.",
            _ if event.hook_event_name == "PreToolUse" => "Codex가 도구를 사용하고 있어요.",
            _ => "Codex가 작업하고 있어요.",
        };
        session.activity = Some(Activity {
            tool_active: session.active_tools.values().any(|count| *count > 0),
            tool_failed,
            session_id: event.session_id.clone(),
            phase: phase.into(),
            text: if phase == "working" {
                session.progress.as_deref().unwrap_or(text).into()
            } else {
                text.into()
            },
            tool: event.tool_name.clone(),
            received_at: event.emitted_at,
            notification_id,
            response: if phase == "response" {
                event.response.clone()
            } else {
                None
            },
        });
        true
    }

    pub fn sessions(&self) -> Vec<Activity> {
        self.sessions
            .values()
            .filter_map(|session| session.activity.as_ref())
            .cloned()
            .collect()
    }

    pub fn current(&self) -> Option<Activity> {
        let sessions = self.sessions();
        let newest = sessions
            .iter()
            .map(|item| item.received_at)
            .max()
            .unwrap_or_default();
        sessions.into_iter().max_by_key(|item| {
            let priority = match item.phase.as_str() {
                "approval" => 2,
                "response" if newest.saturating_sub(item.received_at) < 6_000 => 1,
                _ => 0,
            };
            (priority, item.received_at)
        })
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn tool_failure_is_independent_of_working_and_clears_after_a_success_or_new_turn() {
        let mut activities = Activities::default();
        activities.receive(&event("PreToolUse", "one", 1));
        assert!(activities.current().unwrap().tool_active);
        let mut failed = event("PostToolUse", "one", 2);
        failed.tool_failed = true;
        activities.receive(&failed);
        let current = activities.current().unwrap();
        assert_eq!(current.phase, "working");
        assert!(current.tool_failed);
        assert!(!current.tool_active);
        activities.receive(&event("PreToolUse", "one", 3));
        assert!(activities.current().unwrap().tool_failed);
        let mut other = event("PostToolUse", "one", 3);
        other.tool_name = Some("Read".into());
        activities.receive(&other);
        assert!(activities.current().unwrap().tool_failed);
        activities.receive(&event("PostToolUse", "one", 4));
        assert!(!activities.current().unwrap().tool_failed);
        activities.receive(&failed);
        activities.receive(&event("UserPromptSubmit", "two", 5));
        assert!(!activities.current().unwrap().tool_failed);
    }
    #[test]
    fn keeps_public_progress_across_tools_and_clears_it_for_the_next_turn() {
        let mut activities = Activities::default();
        activities.receive(&event("PreToolUse", "turn", 1));
        let notification = activities.current().unwrap().notification_id;
        assert!(activities.progress("chat", "turn", "실제 진행 메시지".into()));
        activities.receive(&event("PostToolUse", "turn", 2));
        let current = activities.current().unwrap();
        assert_eq!(current.text, "실제 진행 메시지");
        assert_eq!(current.tool.as_deref(), Some("Bash"));
        assert_eq!(current.notification_id, notification);
        activities.receive(&event("PermissionRequest", "turn", 3));
        assert!(!activities.progress("chat", "turn", "최신 진행".into()));
        assert_eq!(activities.current().unwrap().phase, "approval");
        activities.receive(&event("PostToolUse", "turn", 4));
        assert_eq!(activities.current().unwrap().text, "최신 진행");
        activities.receive(&event("UserPromptSubmit", "next", 5));
        assert_eq!(
            activities.current().unwrap().text,
            "Codex가 작업하고 있어요."
        );
        assert!(!activities.progress("chat", "turn", "오래된 조회 결과".into()));
    }

    #[test]
    fn late_progress_cannot_replace_a_response_or_another_chat() {
        let mut activities = Activities::default();
        activities.receive(&event("PreToolUse", "turn", 1));
        assert!(!activities.progress("other", "turn", "다른 채팅".into()));
        let mut done = event("Stop", "turn", 2);
        done.response = Some("실제 응답".into());
        activities.receive(&done);
        assert!(!activities.progress("chat", "turn", "늦은 조회 결과".into()));
        let current = activities.current().unwrap();
        assert_eq!(current.phase, "response");
        assert_eq!(current.response.as_deref(), Some("실제 응답"));
    }

    fn event(name: &str, turn: &str, time: u64) -> HookEvent {
        HookEvent {
            tool_failed: false,
            approval: None,
            hook_event_name: name.into(),
            session_id: "chat".into(),
            turn_id: Some(turn.into()),
            tool_name: Some("Bash".into()),
            response: None,
            emitted_at: time,
        }
    }

    #[test]
    fn notification_changes_for_new_messages_but_not_tool_progress() {
        let mut activities = Activities::default();
        activities.receive(&event("UserPromptSubmit", "one", 1));
        let first = activities.current().unwrap().notification_id;
        activities.receive(&event("PreToolUse", "one", 2));
        activities.receive(&event("PostToolUse", "one", 3));
        assert_eq!(activities.current().unwrap().notification_id, first);
        activities.receive(&event("PermissionRequest", "one", 4));
        let approval = activities.current().unwrap().notification_id;
        assert_ne!(approval, first);
        let mut response = event("Stop", "one", 5);
        response.response = Some("실제 응답\n두 번째 줄".into());
        activities.receive(&response);
        let latest = activities.current().unwrap();
        assert_ne!(latest.notification_id, approval);
        assert_eq!(latest.response.as_deref(), Some("실제 응답\n두 번째 줄"));
        activities.receive(&event("UserPromptSubmit", "two", 6));
        assert_ne!(
            activities.current().unwrap().notification_id,
            latest.notification_id
        );
        assert_eq!(activities.current().unwrap().response, None);
    }

    #[test]
    fn questions_keep_pending_approvals_and_cannot_reopen_an_ended_turn() {
        let mut activities = Activities::default();
        activities.receive(&event("PermissionRequest", "one", 1));
        let previous = activities.current().unwrap().notification_id;
        activities.question("chat", "one");
        assert_eq!(activities.current().unwrap().phase, "question");
        assert_ne!(activities.current().unwrap().notification_id, previous);
        activities.question_ended("chat", "one");
        assert_eq!(activities.current().unwrap().phase, "approval");
        activities.receive(&event("Stop", "one", 2));
        activities.question("chat", "one");
        assert_eq!(activities.current().unwrap().phase, "response");
    }

    #[test]
    fn another_chats_tool_events_do_not_immediately_replace_a_response() {
        let mut activities = Activities::default();
        activities.receive(&event("Stop", "first", 100));
        let mut other = event("PreToolUse", "other", 101);
        other.session_id = "other-chat".into();
        activities.receive(&other);
        assert_eq!(activities.current().unwrap().phase, "response");
        assert_eq!(activities.sessions().len(), 2);
        other.emitted_at = 6_101;
        activities.receive(&other);
        assert_eq!(activities.current().unwrap().phase, "working");
        let mut approval = event("PermissionRequest", "third", 6_102);
        approval.session_id = "third-chat".into();
        activities.receive(&approval);
        assert_eq!(activities.current().unwrap().phase, "approval");
    }
    #[test]
    fn response_is_not_task_completion_and_late_tool_events_cannot_replace_it() {
        let mut activity = Activities::default();
        activity.receive(&event("UserPromptSubmit", "first", 1));
        activity.receive(&event("Stop", "first", 4));
        assert!(!activity.receive(&event("PreToolUse", "first", 3)));
        assert_eq!(activity.current().unwrap().phase, "response");
        assert!(!activity.current().unwrap().text.contains("작업 완료"));
        activity.receive(&event("UserPromptSubmit", "second", 5));
        assert_eq!(activity.current().unwrap().phase, "working");
    }
    #[test]
    fn retains_approval_until_its_tool_returns_and_does_not_regress_for_a_late_prompt() {
        let mut activity = Activities::default();
        activity.receive(&event("PermissionRequest", "turn", 2));
        activity.receive(&event("UserPromptSubmit", "turn", 1));
        activity.receive(&event("PreToolUse", "turn", 3));
        assert_eq!(activity.current().unwrap().phase, "approval");
        activity.receive(&event("PostToolUse", "turn", 4));
        assert_eq!(activity.current().unwrap().phase, "working");
    }
}
