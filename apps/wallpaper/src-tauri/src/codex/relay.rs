use super::{Connection, activity::HookEvent};
use serde::Deserialize;
use serde_json::{Value, json};
use std::{
    fs,
    io::{Read, Write},
    net::{SocketAddr, TcpStream},
    path::Path,
    time::{Duration, SystemTime, UNIX_EPOCH},
};

#[derive(Deserialize)]
struct Input {
    hook_event_name: String,
    session_id: String,
    turn_id: Option<String>,
    tool_name: Option<String>,
    transcript_path: Option<String>,
    last_assistant_message: Option<String>,
    cwd: Option<String>,
    tool_input: Option<Value>,
    tool_response: Option<Value>,
}

pub fn relay(path: &Path, input: impl Read) -> Result<(), String> {
    deliver(path, input, false).map(|_| ())
}

fn deliver(path: &Path, input: impl Read, interactive: bool) -> Result<Value, String> {
    let connection: Connection =
        serde_json::from_slice(&fs::read(path).map_err(|error| error.to_string())?)
            .map_err(|error| error.to_string())?;
    let input: Input =
        serde_json::from_reader(input.take(1_048_576)).map_err(|error| error.to_string())?;
    if input.session_id.len() > 128
        || !super::hooks::EVENTS.contains(&input.hook_event_name.as_str())
    {
        return Err("Unsupported hook event".into());
    }
    // Ephemeral forks also emit hooks, but do not represent a persisted chat.
    let Some(transcript) = input
        .transcript_path
        .as_deref()
        .filter(|path| !path.is_empty())
    else {
        return Ok(json!({}));
    };
    if input.hook_event_name == "PermissionRequest"
        && !super::reviewer::uses_manual_review(Path::new(transcript), input.turn_id.as_deref())
    {
        return Ok(json!({}));
    }
    let response = input
        .last_assistant_message
        .filter(|_| input.hook_event_name == "Stop")
        .map(|text| {
            const LIMIT: usize = 65_536;
            let mut bounded: String = text.chars().take(LIMIT).collect();
            if text.chars().count() > LIMIT {
                bounded.push_str("\n\n…응답 일부가 생략됐습니다.");
            }
            bounded
        });
    let approval = if interactive && input.hook_event_name == "PermissionRequest" {
        let value = input.tool_input.ok_or("Missing approval input")?;
        if serde_json::to_vec(&value)
            .map_err(|error| error.to_string())?
            .len()
            > 65_536
        {
            return Err("Approval input exceeds its display limit".into());
        }
        Some(super::approvals::Input {
            id: uuid::Uuid::new_v4().to_string(),
            cwd: input.cwd.unwrap_or_default(),
            input: value,
        })
    } else {
        None
    };
    let waiting = approval.is_some();
    let tool_failed = input.hook_event_name == "PostToolUse"
        && super::tool_failure::failed(input.tool_name.as_deref(), input.tool_response.as_ref());
    let event = HookEvent {
        tool_failed,
        approval,
        hook_event_name: input.hook_event_name,
        session_id: input.session_id,
        turn_id: input.turn_id.filter(|id| id.len() <= 128),
        tool_name: input.tool_name.map(|name| {
            name.chars()
                .filter(|value| !value.is_control())
                .take(100)
                .collect()
        }),
        response,
        emitted_at: SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap_or_default()
            .as_millis() as u64,
    };
    let body = serde_json::to_vec(&event).map_err(|error| error.to_string())?;
    let address = SocketAddr::from(([127, 0, 0, 1], connection.port));
    let timeout = Duration::from_millis(150);
    let mut stream =
        TcpStream::connect_timeout(&address, timeout).map_err(|error| error.to_string())?;
    stream
        .set_write_timeout(Some(timeout))
        .map_err(|error| error.to_string())?;
    let header = format!(
        "POST /events HTTP/1.1\r\nHost: 127.0.0.1\r\nAuthorization: Bearer {}\r\nContent-Type: application/json\r\nContent-Length: {}\r\nConnection: close\r\n\r\n",
        connection.token,
        body.len()
    );
    stream
        .write_all(header.as_bytes())
        .and_then(|_| stream.write_all(&body))
        .map_err(|error| error.to_string())?;
    if !waiting {
        return Ok(json!({}));
    }
    stream
        .set_read_timeout(Some(Duration::from_secs(125)))
        .map_err(|error| error.to_string())?;
    let mut reply = String::new();
    stream
        .take(8192)
        .read_to_string(&mut reply)
        .map_err(|error| error.to_string())?;
    let body = reply
        .split_once("\r\n\r\n")
        .ok_or("Invalid approval response")?
        .1;
    let decision: super::approvals::Decision =
        serde_json::from_str(body).map_err(|error| error.to_string())?;
    Ok(decision.output())
}

pub fn command_mode() -> bool {
    let mut arguments = std::env::args_os().skip(1);
    if arguments.next().as_deref() != Some(std::ffi::OsStr::new("--poffo-codex-hook")) {
        return false;
    }
    let output = arguments
        .next()
        .and_then(|path| {
            let interactive =
                arguments.next().as_deref() == Some(std::ffi::OsStr::new("--poffo-decision"));
            if interactive {
                deliver(Path::new(&path), std::io::stdin().lock(), true).ok()
            } else {
                relay(Path::new(&path), std::io::stdin().lock())
                    .ok()
                    .map(|()| json!({}))
            }
        })
        .unwrap_or_else(|| json!({}));
    println!("{output}");
    true
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn ignores_unpersisted_sessions_without_contacting_the_app() {
        let directory = tempfile::tempdir().unwrap();
        let path = directory.path().join("connection.json");
        let listener = std::net::TcpListener::bind("127.0.0.1:0").unwrap();
        let port = listener.local_addr().unwrap().port();
        drop(listener);
        fs::write(
            &path,
            serde_json::to_vec(&Connection {
                port,
                token: "test-token".into(),
                registration: None,
                hooks_path: directory.path().join("hooks.json"),
            })
            .unwrap(),
        )
        .unwrap();
        for transcript in [
            None,
            Some(serde_json::Value::Null),
            Some(serde_json::json!("")),
        ] {
            let mut input = serde_json::json!({
                "hook_event_name": "Stop",
                "session_id": "temporary-fork",
            });
            if let Some(transcript) = transcript {
                input["transcript_path"] = transcript;
            }
            let body = serde_json::to_vec(&input).unwrap();
            assert!(relay(&path, body.as_slice()).is_ok());
        }
    }

    #[test]
    fn forwards_only_notification_metadata() {
        let listener = std::net::TcpListener::bind("127.0.0.1:0").unwrap();
        let directory = tempfile::tempdir().unwrap();
        let path = directory.path().join("connection.json");
        fs::write(
            &path,
            serde_json::to_vec(&Connection {
                port: listener.local_addr().unwrap().port(),
                token: "test-token".into(),
                registration: None,
                hooks_path: directory.path().join("hooks.json"),
            })
            .unwrap(),
        )
        .unwrap();
        relay(&path, br#"{"hook_event_name":"PreToolUse","session_id":"chat","turn_id":"turn","tool_name":"Bash","tool_input":{"command":"private command"},"transcript_path":"private/path"}"#.as_slice()).unwrap();
        let (mut connection, _) = listener.accept().unwrap();
        let mut request = String::new();
        connection.read_to_string(&mut request).unwrap();
        assert!(request.contains("Authorization: Bearer test-token"));
        assert!(request.contains("PreToolUse"));
        assert!(!request.contains("private"));
        relay(&path, br#"{"hook_event_name":"PostToolUse","session_id":"chat","tool_name":"Bash","tool_response":{"exit_code":7,"output":"private output"},"transcript_path":"private/path"}"#.as_slice()).unwrap();
        let (mut connection, _) = listener.accept().unwrap();
        let mut request = String::new();
        connection.read_to_string(&mut request).unwrap();
        let body: serde_json::Value =
            serde_json::from_str(request.split("\r\n\r\n").nth(1).unwrap()).unwrap();
        assert_eq!(body["tool_failed"], true);
        assert!(!request.contains("private"));
        assert!(!request.contains("exit_code"));
    }
    #[test]
    fn forwards_response_text_only_for_stop() {
        let listener = std::net::TcpListener::bind("127.0.0.1:0").unwrap();
        let directory = tempfile::tempdir().unwrap();
        let path = directory.path().join("connection.json");
        fs::write(
            &path,
            serde_json::to_vec(&Connection {
                port: listener.local_addr().unwrap().port(),
                token: "test".into(),
                registration: None,
                hooks_path: directory.path().join("hooks.json"),
            })
            .unwrap(),
        )
        .unwrap();
        for kind in ["Stop", "PostToolUse"] {
            let input = serde_json::json!({"hook_event_name":kind,"session_id":"chat",
                "transcript_path":"unread/path", "last_assistant_message":"실제 응답\n둘째 줄"});
            relay(&path, serde_json::to_vec(&input).unwrap().as_slice()).unwrap();
            let (mut stream, _) = listener.accept().unwrap();
            let mut request = String::new();
            stream.read_to_string(&mut request).unwrap();
            let body: serde_json::Value =
                serde_json::from_str(request.split("\r\n\r\n").nth(1).unwrap()).unwrap();
            if kind == "Stop" {
                assert_eq!(body["response"], "실제 응답\n둘째 줄");
            } else {
                assert!(body["response"].is_null());
            }
            assert!(!request.contains("unread/path"));
        }
    }
    #[test]
    fn interactive_relay_returns_only_the_decision_received_from_the_app() {
        for decision in [
            super::super::approvals::Decision::Allow,
            super::super::approvals::Decision::Deny,
            super::super::approvals::Decision::Codex,
        ] {
            let listener = std::net::TcpListener::bind("127.0.0.1:0").unwrap();
            let directory = tempfile::tempdir().unwrap();
            let path = directory.path().join("connection.json");
            fs::write(
                &path,
                serde_json::to_vec(&Connection {
                    port: listener.local_addr().unwrap().port(),
                    token: "test".into(),
                    registration: None,
                    hooks_path: directory.path().join("hooks.json"),
                })
                .unwrap(),
            )
            .unwrap();
            let server = std::thread::spawn(move || {
                let (mut stream, _) = listener.accept().unwrap();
                let event = super::super::server::read_event(&mut stream, "test").unwrap();
                assert_eq!(event.approval.unwrap().input["command"], "pwd");
                super::super::server::respond_decision(&mut stream, decision).unwrap();
            });
            let transcript = directory.path().join("transcript.jsonl");
            fs::write(&transcript, br#"{"type":"turn_context","payload":{"turn_id":"turn","approvals_reviewer":"user"}}"#).unwrap();
            let input = serde_json::to_vec(&json!({"hook_event_name":"PermissionRequest","session_id":"chat","turn_id":"turn","transcript_path":transcript,"tool_input":{"command":"pwd"},"cwd":"/tmp"})).unwrap();
            assert_eq!(
                deliver(&path, input.as_slice(), true).unwrap(),
                decision.output()
            );
            server.join().unwrap();
        }
    }
    #[test]
    fn automatic_and_unknown_review_do_not_contact_poffo_or_return_an_approval() {
        let directory = tempfile::tempdir().unwrap();
        let path = directory.path().join("connection.json");
        let listener = std::net::TcpListener::bind("127.0.0.1:0").unwrap();
        listener.set_nonblocking(true).unwrap();
        fs::write(
            &path,
            serde_json::to_vec(&Connection {
                port: listener.local_addr().unwrap().port(),
                token: "test".into(),
                hooks_path: directory.path().join("hooks.json"),
                registration: None,
            })
            .unwrap(),
        )
        .unwrap();
        let transcript = directory.path().join("transcript.jsonl");
        for reviewer in ["auto_review", "guardian_subagent", "unknown"] {
            fs::write(
                &transcript,
                serde_json::to_vec(&json!({"type":"turn_context","payload":{
                    "turn_id":"turn", "approvals_reviewer":reviewer
                }}))
                .unwrap(),
            )
            .unwrap();
            let input = serde_json::to_vec(&json!({"hook_event_name":"PermissionRequest",
                "session_id":"chat","turn_id":"turn","transcript_path":transcript,
                "tool_input":{"command":"pwd"}}))
            .unwrap();
            assert_eq!(deliver(&path, input.as_slice(), true).unwrap(), json!({}));
            assert_eq!(
                listener.accept().unwrap_err().kind(),
                std::io::ErrorKind::WouldBlock
            );
        }
    }
    #[test]
    fn unavailable_app_and_invalid_input_return_without_waiting_for_an_app() {
        let directory = tempfile::tempdir().unwrap();
        assert!(relay(&directory.path().join("missing"), b"{}".as_slice()).is_err());
        let listener = std::net::TcpListener::bind("127.0.0.1:0").unwrap();
        let port = listener.local_addr().unwrap().port();
        drop(listener);
        let path = directory.path().join("connection.json");
        fs::write(
            &path,
            serde_json::to_vec(&Connection {
                port,
                token: "test".into(),
                registration: None,
                hooks_path: directory.path().join("hooks.json"),
            })
            .unwrap(),
        )
        .unwrap();
        assert!(
            relay(
                &path,
                br#"{"hook_event_name":"Stop","session_id":"chat","transcript_path":"unread/path"}"#.as_slice()
            )
            .is_err()
        );
    }
}
