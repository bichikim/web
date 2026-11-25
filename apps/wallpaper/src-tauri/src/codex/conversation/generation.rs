use super::{Client, Error, Message, Request, Role, models};
use serde_json::{Value, json};

const INSTRUCTIONS: &str = "너는 바탕화면에서 사용자와 함께 지내는 다정한 대화 상대야. 사용자가 쓴 언어로 자연스럽게 1~3문장으로 답해. 별도 요청이 없으면 한국어로 답해. 도구나 파일, 명령어, 외부 서비스를 사용하지 말고 대화로만 답해. Codex 작업을 수행한다고 말하지 마.";

fn thread_params(model: Option<&str>) -> Value {
    json!({"model":model,"ephemeral":true,"baseInstructions":INSTRUCTIONS,"developerInstructions":"",
        "approvalPolicy":"never","sandbox":"read-only","environments":[],
        "serviceName":"poffo_conversation"})
}
fn history_items(messages: &[Message]) -> Vec<Value> {
    messages.iter().map(|message| {
        let content_type = match message.role { Role::User => "input_text", Role::Assistant => "output_text" };
        json!({"type":"message","role":message.role,"content":[{"type":content_type,"text":message.content}]})
    }).collect()
}
fn answer_item(value: &Value) -> Option<String> {
    (value["type"] == "agentMessage" && value["phase"] != "commentary")
        .then(|| {
            value["text"]
                .as_str()
                .map(str::trim)
                .filter(|text| !text.is_empty())
                .map(str::to_owned)
        })
        .flatten()
}

pub(super) async fn generate(request: &Request) -> Result<String, Error> {
    let mut client = Client::connect().await?;
    let available = models(&mut client).await?;
    if request
        .model
        .as_ref()
        .is_some_and(|id| !available.iter().any(|model| &model.id == id))
    {
        return Err(Error::ModelUnavailable);
    }
    let selected = request.model.as_deref().or_else(|| {
        available
            .iter()
            .find(|model| model.default)
            .map(|model| model.id.as_str())
    });
    let thread = client.call("thread/start", thread_params(selected)).await?;
    let thread_id = thread["thread"]["id"]
        .as_str()
        .ok_or(Error::Unavailable)?
        .to_owned();
    let (input, history) = request.messages.split_last().ok_or(Error::InvalidRequest)?;
    if !history.is_empty() {
        client
            .call(
                "thread/inject_items",
                json!({"threadId":thread_id,"items":history_items(history)}),
            )
            .await?;
    }
    let started = client.call("turn/start", json!({"threadId":thread_id,
        "input":[{"type":"text","text":input.content}],"model":selected,
        "outputSchema":{"type":"object","properties":{"answer":{"type":"string"}},"required":["answer"],"additionalProperties":false}
    })).await?;
    let turn_id = started["turn"]["id"]
        .as_str()
        .ok_or(Error::Unavailable)?
        .to_owned();
    let mut answer = None;
    loop {
        let event = client.receive().await?;
        let params = &event["params"];
        if params["threadId"].as_str() != Some(&thread_id) {
            continue;
        }
        if event["method"] == "item/completed" && params["turnId"].as_str() == Some(&turn_id) {
            if let Some(text) = answer_item(&params["item"]) {
                answer = Some(text);
            }
        }
        if event["method"] == "turn/completed" && params["turn"]["id"].as_str() == Some(&turn_id) {
            if params["turn"]["status"] != "completed" {
                return Err(Error::Unavailable);
            }
            let text = answer.ok_or(Error::Unavailable)?;
            let value: Value = serde_json::from_str(&text).map_err(|_| Error::Unavailable)?;
            return value["answer"]
                .as_str()
                .map(str::trim)
                .filter(|text| !text.is_empty())
                .map(str::to_owned)
                .ok_or(Error::Unavailable);
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn uses_ephemeral_read_only_dialogue_and_keeps_roles_in_context() {
        let params = thread_params(Some("picked"));
        assert_eq!(params["model"], "picked");
        assert_eq!(params["ephemeral"], true);
        assert_eq!(params["sandbox"], "read-only");
        assert_eq!(params["environments"], json!([]));
        let messages = vec![
            Message {
                role: Role::User,
                content: "question".into(),
            },
            Message {
                role: Role::Assistant,
                content: "answer".into(),
            },
        ];
        let items = history_items(&messages);
        assert_eq!(items[0]["role"], "user");
        assert_eq!(items[1]["content"][0]["type"], "output_text");
    }
    #[test]
    fn returns_public_answers_only() {
        assert_eq!(
            answer_item(&json!({"type":"agentMessage","phase":"final_answer","text":"hi"})),
            Some("hi".into())
        );
        assert!(answer_item(&json!({"type":"reasoning","text":"private"})).is_none());
        assert!(
            answer_item(&json!({"type":"agentMessage","phase":"commentary","text":"working"}))
                .is_none()
        );
    }
}
