pub mod protocol;
pub mod registration;
pub mod runtime;
mod transport;

use serde::{Deserialize, Serialize};
use std::{
    collections::{BTreeMap, BTreeSet, VecDeque},
    sync::mpsc,
};

#[derive(Clone, Deserialize, Serialize)]
pub struct Choice {
    pub label: String,
    #[serde(default)]
    pub description: String,
}

#[derive(Clone, Deserialize, Serialize)]
pub struct Question {
    pub id: String,
    pub question: String,
    #[serde(default)]
    pub options: Vec<Choice>,
}

#[derive(Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Request {
    pub id: String,
    pub session_id: String,
    pub turn_id: String,
    pub questions: Vec<Question>,
}

impl Request {
    pub fn validate(&self) -> Result<(), String> {
        if uuid::Uuid::parse_str(&self.id).is_err()
            || uuid::Uuid::parse_str(&self.session_id).is_err()
            || uuid::Uuid::parse_str(&self.turn_id).is_err()
            || !(1..=3).contains(&self.questions.len())
        {
            return Err("Invalid question request".into());
        }
        let mut ids = BTreeSet::new();
        for question in &self.questions {
            if question.id.is_empty()
                || question.id.len() > 64
                || !ids.insert(&question.id)
                || question.question.trim().is_empty()
                || question.question.len() > 8000
                || question.options.len() > 8
                || question.options.iter().any(|choice| {
                    choice.label.trim().is_empty()
                        || choice.label.len() > 800
                        || choice.description.len() > 2400
                })
                || question
                    .options
                    .iter()
                    .map(|choice| &choice.label)
                    .collect::<BTreeSet<_>>()
                    .len()
                    != question.options.len()
            {
                return Err("Invalid question content".into());
            }
        }
        Ok(())
    }
}

#[derive(Clone, Debug, Deserialize, Serialize, PartialEq)]
#[serde(tag = "status", rename_all = "camelCase")]
pub enum Reply {
    Answered { answers: BTreeMap<String, String> },
    Unavailable,
    Cancelled,
}

#[derive(Default)]
pub struct Pending {
    requests: BTreeMap<String, (Request, mpsc::Sender<Reply>)>,
    cancelled: VecDeque<String>,
}

impl Pending {
    pub fn insert(&mut self, request: Request) -> Result<mpsc::Receiver<Reply>, String> {
        request.validate()?;
        if self.requests.len() >= 32
            || self.requests.contains_key(&request.id)
            || self.cancelled.contains(&request.id)
        {
            return Err("Question queue is full or request already exists".into());
        }
        let (sender, receiver) = mpsc::channel();
        self.requests.insert(request.id.clone(), (request, sender));
        Ok(receiver)
    }
    pub fn list(&self) -> Vec<Request> {
        self.requests
            .values()
            .map(|(request, _)| request.clone())
            .collect()
    }
    pub fn contains_session(&self, session: &str) -> bool {
        self.requests
            .values()
            .any(|(request, _)| request.session_id == session)
    }
    pub fn answer(&mut self, id: &str, answers: BTreeMap<String, String>) -> Result<(), String> {
        let (request, _) = self.requests.get(id).ok_or("질문이 종료됐습니다.")?;
        if answers.len() != request.questions.len()
            || request.questions.iter().any(|question| {
                answers
                    .get(&question.id)
                    .is_none_or(|answer| answer.trim().is_empty() || answer.len() > 16_000)
            })
        {
            return Err("모든 질문에 답해 주세요.".into());
        }
        let (_, sender) = self.requests.remove(id).ok_or("질문이 종료됐습니다.")?;
        sender
            .send(Reply::Answered { answers })
            .map_err(|_| "질문이 종료됐습니다.".into())
    }
    pub fn cancel(&mut self, id: &str) {
        self.cancelled.push_back(id.into());
        if self.cancelled.len() > 64 {
            self.cancelled.pop_front();
        }
        if let Some((_, sender)) = self.requests.remove(id) {
            let _ = sender.send(Reply::Cancelled);
        }
    }
    pub fn retain(&mut self, sessions: &BTreeSet<String>) {
        self.requests
            .retain(|_, (request, _)| sessions.contains(&request.session_id));
    }
    pub fn cancel_session(&mut self, session: &str) {
        self.requests
            .retain(|_, (request, _)| request.session_id != session);
    }
    pub fn clear(&mut self) {
        self.requests.clear();
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    fn request() -> Request {
        Request {
            id: uuid::Uuid::new_v4().to_string(),
            session_id: uuid::Uuid::new_v4().to_string(),
            turn_id: uuid::Uuid::new_v4().to_string(),
            questions: vec![Question {
                id: "color".into(),
                question: "색상?".into(),
                options: vec![],
            }],
        }
    }
    #[test]
    fn answers_are_complete_single_use_and_isolated() {
        let mut pending = Pending::default();
        let first = request();
        let second = request();
        let one = pending.insert(first.clone()).unwrap();
        let two = pending.insert(second.clone()).unwrap();
        assert!(pending.answer(&first.id, BTreeMap::new()).is_err());
        pending
            .answer(
                &second.id,
                BTreeMap::from([("color".into(), "직접 답변".into())]),
            )
            .unwrap();
        assert_eq!(
            two.recv().unwrap(),
            Reply::Answered {
                answers: BTreeMap::from([("color".into(), "직접 답변".into())])
            }
        );
        assert!(one.try_recv().is_err());
        assert!(pending.answer(&second.id, BTreeMap::new()).is_err());
        pending.cancel(&first.id);
        assert_eq!(one.recv().unwrap(), Reply::Cancelled);
    }
    #[test]
    fn closed_widgets_and_disconnection_release_waiters() {
        let mut pending = Pending::default();
        let first = request();
        let receiver = pending.insert(first).unwrap();
        pending.retain(&BTreeSet::new());
        assert!(receiver.recv().is_err());
        let receiver = pending.insert(request()).unwrap();
        pending.clear();
        assert!(receiver.recv().is_err());
    }
    #[test]
    fn cancellation_before_arrival_rejects_the_late_request() {
        let mut pending = Pending::default();
        let request = request();
        pending.cancel(&request.id);
        assert!(pending.insert(request).is_err());
    }
    #[test]
    fn rejects_duplicate_questions_and_oversized_content() {
        let mut value = request();
        value.questions.push(value.questions[0].clone());
        assert!(value.validate().is_err());
        value.questions.pop();
        value.questions[0].question = "x".repeat(8001);
        assert!(value.validate().is_err());
    }
}
