use super::approvals::{Decision, Request};
use serde::Serialize;
use std::{collections::VecDeque, time::SystemTime};

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Receipt {
    request_id: String,
    session_id: String,
    turn_id: Option<String>,
    decision: Decision,
    selected_at: u64,
    written_to_relay: bool,
}

#[derive(Default, Serialize)]
#[serde(transparent)]
pub struct Receipts(VecDeque<Receipt>);

impl Receipts {
    pub fn selected(&mut self, request: &Request, decision: Decision) {
        self.0.push_back(Receipt {
            request_id: request.id.clone(),
            session_id: request.session_id.clone(),
            turn_id: request.turn_id.clone(),
            decision,
            selected_at: SystemTime::now()
                .duration_since(SystemTime::UNIX_EPOCH)
                .unwrap_or_default()
                .as_millis() as u64,
            written_to_relay: false,
        });
        if self.0.len() > 32 {
            self.0.pop_front();
        }
    }

    pub fn forwarded(&mut self, id: &str, written: bool) {
        if let Some(receipt) = self.0.iter_mut().find(|receipt| receipt.request_id == id) {
            receipt.written_to_relay = written;
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    fn request(id: &str) -> Request {
        Request {
            id: id.into(),
            session_id: "chat".into(),
            turn_id: Some("turn".into()),
            tool: "Bash".into(),
            cwd: "/private".into(),
            input: json!({"command":"secret"}),
        }
    }

    #[test]
    fn records_the_selected_request_without_command_or_folder_contents() {
        let mut receipts = Receipts::default();
        receipts.selected(&request("first"), Decision::Allow);
        receipts.selected(&request("second"), Decision::Deny);
        receipts.forwarded("second", true);
        let value = serde_json::to_value(&receipts).unwrap();
        assert_eq!(value[0]["requestId"], "first");
        assert_eq!(value[0]["decision"], "allow");
        assert_eq!(value[0]["writtenToRelay"], false);
        assert_eq!(value[1]["decision"], "deny");
        assert_eq!(value[1]["writtenToRelay"], true);
        let text = value.to_string();
        assert!(!text.contains("secret"));
        assert!(!text.contains("/private"));
    }

    #[test]
    fn retains_only_the_latest_32_decisions() {
        let mut receipts = Receipts::default();
        for index in 0..40 {
            receipts.selected(&request(&index.to_string()), Decision::Codex);
        }
        let value = serde_json::to_value(&receipts).unwrap();
        assert_eq!(value.as_array().unwrap().len(), 32);
        assert_eq!(value[0]["requestId"], "8");
        assert_eq!(value[31]["requestId"], "39");
    }
}
