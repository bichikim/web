use serde::{Deserialize, Serialize};
use serde_json::{Value, json};
use std::{
    collections::{BTreeMap, BTreeSet},
    sync::mpsc,
};

#[derive(Clone, Debug, Deserialize, Serialize)]
pub struct Input {
    pub id: String,
    pub cwd: String,
    pub input: Value,
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Request {
    pub id: String,
    pub session_id: String,
    pub turn_id: Option<String>,
    pub tool: String,
    pub cwd: String,
    pub input: Value,
}

#[derive(Clone, Copy, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub enum Decision {
    Allow,
    Deny,
    Codex,
}

impl Decision {
    pub fn output(self) -> Value {
        let decision = match self {
            Self::Allow => json!({"behavior":"allow"}),
            Self::Deny => json!({"behavior":"deny", "message":"사용자가 Poffo에서 거절했습니다."}),
            Self::Codex => return json!({}),
        };
        json!({"hookSpecificOutput":{"hookEventName":"PermissionRequest", "decision":decision}})
    }
}

#[derive(Default)]
pub struct Pending(BTreeMap<String, (Request, mpsc::Sender<Decision>)>);

impl Pending {
    pub fn insert(&mut self, request: Request) -> Option<mpsc::Receiver<Decision>> {
        if self.0.len() >= 32 || self.0.contains_key(&request.id) {
            return None;
        }
        let (sender, receiver) = mpsc::channel();
        self.0.insert(request.id.clone(), (request, sender));
        Some(receiver)
    }

    pub fn list(&self) -> Vec<Request> {
        self.0
            .values()
            .map(|(request, _)| request.clone())
            .collect()
    }

    pub fn resolve(&mut self, id: &str, decision: Decision) -> Result<Request, String> {
        let (request, sender) = self
            .0
            .remove(id)
            .ok_or("이미 처리되었거나 만료된 승인입니다.")?;
        sender
            .send(decision)
            .map_err(|_| String::from("승인 요청이 종료되었습니다."))?;
        Ok(request)
    }

    pub fn cancel(&mut self, id: &str) {
        self.0.remove(id);
    }

    pub fn retain(&mut self, sessions: &BTreeSet<String>) {
        self.0
            .retain(|_, (request, _)| sessions.contains(&request.session_id));
    }

    pub fn cancel_session(&mut self, session: &str) {
        self.0
            .retain(|_, (request, _)| request.session_id != session);
    }

    pub fn clear(&mut self) {
        self.0.clear();
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn request(id: &str) -> Request {
        Request {
            id: id.into(),
            session_id: "chat".into(),
            turn_id: Some("turn".into()),
            tool: "Bash".into(),
            cwd: "/tmp".into(),
            input: json!({"command":"pwd"}),
        }
    }

    #[test]
    fn decisions_are_single_use_and_isolated_between_concurrent_requests() {
        let mut pending = Pending::default();
        let first = pending.insert(request("first")).unwrap();
        let second = pending.insert(request("second")).unwrap();
        assert!(pending.insert(request("first")).is_none());
        pending.resolve("second", Decision::Deny).unwrap();
        assert_eq!(
            second.recv().unwrap().output()["hookSpecificOutput"]["decision"]["behavior"],
            "deny"
        );
        assert!(first.try_recv().is_err());
        assert!(pending.resolve("second", Decision::Allow).is_err());
        pending.resolve("first", Decision::Allow).unwrap();
        assert_eq!(
            first.recv().unwrap().output()["hookSpecificOutput"]["decision"]["behavior"],
            "allow"
        );
        assert!(pending.list().is_empty());
    }

    #[test]
    fn closing_all_views_or_ending_the_turn_releases_pending_requests() {
        let mut pending = Pending::default();
        let receiver = pending.insert(request("one")).unwrap();
        pending.retain(&BTreeSet::new());
        assert!(receiver.recv().is_err());
        let receiver = pending.insert(request("two")).unwrap();
        pending.cancel_session("other");
        assert!(receiver.try_recv().is_err());
        pending.cancel_session("chat");
        assert!(receiver.recv().is_err());
    }
    #[test]
    fn disconnect_or_expiry_returns_control_without_approval() {
        let mut pending = Pending::default();
        let receiver = pending.insert(request("first")).unwrap();
        pending.clear();
        assert!(receiver.recv().is_err());
        let receiver = pending.insert(request("second")).unwrap();
        pending.cancel("second");
        assert!(receiver.recv().is_err());
        assert_eq!(Decision::Codex.output(), json!({}));
    }
}
