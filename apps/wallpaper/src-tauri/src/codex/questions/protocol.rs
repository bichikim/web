use super::{Question, Reply, Request, transport};
use serde_json::{Value, json};
use std::{
    collections::BTreeMap,
    io::{BufRead, Read, Write},
    path::{Path, PathBuf},
    sync::{
        Arc, Mutex,
        atomic::{AtomicBool, Ordering},
    },
};

type Active = Arc<Mutex<BTreeMap<String, (String, Arc<AtomicBool>)>>>;

fn identity(metadata: &Value) -> Result<(String, String), String> {
    let nested = metadata
        .get("x-codex-turn-metadata")
        .cloned()
        .unwrap_or(Value::Null);
    let turn: Value = match nested {
        Value::String(text) => serde_json::from_str(&text).unwrap_or(Value::Null),
        value => value,
    };
    let session = metadata
        .get("openai/threadId")
        .or_else(|| metadata.get("openai/thread_id"))
        .or_else(|| metadata.get("threadId"))
        .or_else(|| turn.get("thread_id"))
        .and_then(Value::as_str);
    let turn = metadata
        .get("openai/turnId")
        .or_else(|| metadata.get("openai/turn_id"))
        .or_else(|| metadata.get("turnId"))
        .or_else(|| turn.get("turn_id"))
        .and_then(Value::as_str);
    match (session, turn) {
        (Some(session), Some(turn))
            if uuid::Uuid::parse_str(session).is_ok() && uuid::Uuid::parse_str(turn).is_ok() =>
        {
            Ok((session.into(), turn.into()))
        }
        _ => Err("Codex did not provide chat/turn metadata; ask the user in Codex instead.".into()),
    }
}

fn question(params: &Value) -> Result<Request, String> {
    if params.get("name").and_then(Value::as_str) != Some("ask_question") {
        return Err("Unknown Poffo tool".into());
    }
    let (session_id, turn_id) = identity(&params["_meta"])?;
    let questions: Vec<Question> = serde_json::from_value(params["arguments"]["questions"].clone())
        .map_err(|error| error.to_string())?;
    let request = Request {
        id: uuid::Uuid::new_v4().to_string(),
        session_id,
        turn_id,
        questions,
    };
    request.validate()?;
    Ok(request)
}

fn tools() -> Value {
    json!({"tools":[{"name":"ask_question", "description":"Ask the user 1-3 questions in their local Poffo speech bubble. Supports choices and free text. Returns their actual answers to this chat. If unavailable or cancelled, ask in Codex. Never use for command approvals or secrets.",
        "inputSchema":{"type":"object", "required":["questions"], "additionalProperties":false,"properties":{"questions":{"type":"array","minItems":1,"maxItems":3,"items":{"type":"object","required":["id","question"],"additionalProperties":false,"properties":{"id":{"type":"string","minLength":1,"maxLength":64},"question":{"type":"string","minLength":1,"maxLength":2000},"options":{"type":"array","maxItems":8,"items":{"type":"object","required":["label"],"additionalProperties":false,"properties":{"label":{"type":"string","maxLength":200},"description":{"type":"string","maxLength":600}}}}}}}}},
        "annotations":{"readOnlyHint":true,"destructiveHint":false,"openWorldHint":false}}]})
}

fn emit(output: &Arc<Mutex<std::io::Stdout>>, message: Value) {
    if let Ok(mut writer) = output.lock() {
        let _ = writeln!(writer, "{message}");
        let _ = writer.flush();
    }
}
fn error(id: Value, code: i32, message: &str) -> Value {
    json!({"jsonrpc":"2.0","id":id,"error":{"code":code,"message":message}})
}
fn cancel(active: &Active, key: &str, path: &Path) {
    let request = active
        .lock()
        .ok()
        .and_then(|requests| requests.get(key).cloned());
    if let Some((id, flag)) = request {
        flag.store(true, Ordering::SeqCst);
        transport::cancel(path, &id);
    }
}

pub fn serve(path: PathBuf, input: impl BufRead) {
    let output = Arc::new(Mutex::new(std::io::stdout()));
    let active: Active = Arc::new(Mutex::new(BTreeMap::new()));
    let mut initialized = false;
    let mut input = input;
    loop {
        let mut line = String::new();
        match input.by_ref().take(1_048_576).read_line(&mut line) {
            Ok(0) | Err(_) => break,
            Ok(_) if !line.ends_with('\n') => break,
            Ok(_) => {}
        }
        let message: Value = match serde_json::from_str(&line) {
            Ok(value) => value,
            Err(_) => {
                emit(&output, error(Value::Null, -32700, "Invalid JSON"));
                continue;
            }
        };
        let method = message["method"].as_str().unwrap_or_default();
        if method == "notifications/cancelled" {
            cancel(&active, &message["params"]["requestId"].to_string(), &path);
        }
        let Some(id) = message
            .get("id")
            .filter(|id| id.is_string() || id.is_number())
            .cloned()
        else {
            continue;
        };
        if method == "initialize" && !initialized {
            initialized = true;
            let version = message["params"]["protocolVersion"]
                .as_str()
                .filter(|version| {
                    ["2024-11-05", "2025-03-26", "2025-06-18", "2025-11-25"].contains(version)
                })
                .unwrap_or("2025-06-18");
            emit(
                &output,
                json!({"jsonrpc":"2.0","id":id,"result":{"protocolVersion":version,"serverInfo":{"name":"poffo-questions","version":"0.1.0"},"capabilities":{"tools":{}},"instructions":"For user clarification and choices, prefer ask_question to display them in Poffo. Only use actual returned answers. If status is unavailable or cancelled, ask in Codex instead. Do not use for approvals or secrets. This tool cannot send new prompts to idle chats."}}),
            );
        } else if method == "ping" {
            emit(&output, json!({"jsonrpc":"2.0","id":id,"result":{}}));
        } else if !initialized {
            emit(&output, error(id, -32600, "Initialize first"));
        } else if method == "tools/list" {
            emit(&output, json!({"jsonrpc":"2.0","id":id,"result":tools()}));
        } else if method == "tools/call" {
            let request = match question(&message["params"]) {
                Ok(value) => value,
                Err(message) => {
                    emit(&output, error(id, -32602, &message));
                    continue;
                }
            };
            let key = id.to_string();
            let flag = Arc::new(AtomicBool::new(false));
            let accepted = active.lock().is_ok_and(|mut entries| {
                if entries.len() >= 32 || entries.contains_key(&key) {
                    return false;
                }
                entries.insert(key.clone(), (request.id.clone(), flag.clone()));
                true
            });
            if !accepted {
                emit(
                    &output,
                    error(id, -32600, "Poffo question capacity reached"),
                );
                continue;
            }
            let (active, output, path) = (active.clone(), output.clone(), path.clone());
            std::thread::spawn(move || {
                let reply = if flag.load(Ordering::SeqCst) {
                    Reply::Cancelled
                } else {
                    transport::ask(&path, &request)
                };
                let reply = if flag.load(Ordering::SeqCst) {
                    Reply::Cancelled
                } else {
                    reply
                };
                if let Ok(mut entries) = active.lock() {
                    entries.remove(&key);
                }
                emit(
                    &output,
                    json!({"jsonrpc":"2.0","id":id,"result":{"content":[{"type":"text","text":serde_json::to_string(&reply).unwrap_or_default()}],"structuredContent":reply,"isError":false}}),
                );
            });
        } else {
            emit(&output, error(id, -32601, "Unsupported method"));
        }
    }
    let keys = active
        .lock()
        .map(|entries| entries.keys().cloned().collect::<Vec<_>>())
        .unwrap_or_default();
    for key in keys {
        cancel(&active, &key, &path);
    }
}

pub fn command_mode() -> bool {
    let mut arguments = std::env::args_os().skip(1);
    if arguments.next().as_deref() != Some(std::ffi::OsStr::new("--poffo-mcp")) {
        return false;
    }
    if let Some(path) = arguments.next() {
        serve(path.into(), std::io::stdin().lock());
    }
    true
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn binds_questions_to_executor_metadata_instead_of_model_arguments() {
        let session = uuid::Uuid::new_v4().to_string();
        let turn = uuid::Uuid::new_v4().to_string();
        let mut params = json!({"name":"ask_question","arguments":{"sessionId":"wrong","questions":[{"id":"q","question":"선택?"}]},"_meta":{"x-codex-turn-metadata":json!({"thread_id":session,"turn_id":turn}).to_string()}});
        let value = question(&params).unwrap();
        assert_eq!(value.session_id, session);
        assert_eq!(value.turn_id, turn);
        params["_meta"] = json!({});
        assert!(question(&params).is_err());
    }
}
