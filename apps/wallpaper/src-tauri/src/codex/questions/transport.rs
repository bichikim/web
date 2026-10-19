use super::{Reply, Request};
use crate::codex::Connection;
use serde_json::{Value, json};
use std::{
    fs,
    io::{Read, Write},
    net::{SocketAddr, TcpStream},
    path::Path,
    time::Duration,
};

pub fn send(path: &Path, payload: &Value, waiting: bool) -> Result<Value, String> {
    let connection: Connection =
        serde_json::from_slice(&fs::read(path).map_err(|error| error.to_string())?)
            .map_err(|error| error.to_string())?;
    let timeout = Duration::from_millis(150);
    let address = SocketAddr::from(([127, 0, 0, 1], connection.port));
    let mut stream =
        TcpStream::connect_timeout(&address, timeout).map_err(|error| error.to_string())?;
    stream
        .set_write_timeout(Some(timeout))
        .map_err(|error| error.to_string())?;
    let body = serde_json::to_vec(payload).map_err(|error| error.to_string())?;
    write!(stream, "POST /events HTTP/1.1\r\nHost: 127.0.0.1\r\nAuthorization: Bearer {}\r\nContent-Type: application/json\r\nContent-Length: {}\r\nConnection: close\r\n\r\n",connection.token, body.len()).and_then(|()| stream.write_all(&body)).map_err(|error| error.to_string())?;
    if !waiting {
        return Ok(json!({}));
    }
    stream
        .set_read_timeout(Some(Duration::from_secs(125)))
        .map_err(|error| error.to_string())?;
    let mut reply = String::new();
    stream
        .take(100_000)
        .read_to_string(&mut reply)
        .map_err(|error| error.to_string())?;
    let (header, body) = reply
        .split_once("\r\n\r\n")
        .ok_or("Invalid question response")?;
    if !header.starts_with("HTTP/1.1 200 ") {
        return Err("Question was not accepted".into());
    }
    serde_json::from_str(body).map_err(|error| error.to_string())
}

pub fn ask(path: &Path, request: &Request) -> Reply {
    send(path, &json!({"question":request}), true)
        .and_then(|value| serde_json::from_value(value).map_err(|error| error.to_string()))
        .unwrap_or(Reply::Unavailable)
}

pub fn cancel(path: &Path, id: &str) {
    let _ = send(path, &json!({"cancelQuestion":id}), false);
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::codex::{questions::Question, server};
    use std::{collections::BTreeMap, net::TcpListener};

    #[test]
    fn returns_actual_answers_and_cancellation_from_the_authenticated_receiver() {
        for reply in [
            Reply::Answered {
                answers: BTreeMap::from([("q".into(), "보라".into())]),
            },
            Reply::Cancelled,
        ] {
            let listener = TcpListener::bind("127.0.0.1:0").unwrap();
            let directory = tempfile::tempdir().unwrap();
            let path = directory.path().join("connection.json");
            fs::write(
                &path,
                serde_json::to_vec(&Connection {
                    port: listener.local_addr().unwrap().port(),
                    token: "private".into(),
                    hooks_path: directory.path().join("hooks.json"),
                    registration: None,
                })
                .unwrap(),
            )
            .unwrap();
            let expected = reply.clone();
            let receiver = std::thread::spawn(move || {
                let (mut stream, _) = listener.accept().unwrap();
                let server::Incoming::Question { question } =
                    server::read_message(&mut stream, "private").unwrap()
                else {
                    panic!("Expected question");
                };
                assert_eq!(question.questions[0].question, "어떤 색상?");
                server::respond_question(&mut stream, &reply);
            });
            let request = Request {
                id: uuid::Uuid::new_v4().to_string(),
                session_id: uuid::Uuid::new_v4().to_string(),
                turn_id: uuid::Uuid::new_v4().to_string(),
                questions: vec![Question {
                    id: "q".into(),
                    question: "어떤 색상?".into(),
                    options: vec![],
                }],
            };
            assert_eq!(ask(&path, &request), expected);
            receiver.join().unwrap();
        }
    }
    #[test]
    fn an_absent_app_returns_unavailable_instead_of_waiting_for_an_answer() {
        let directory = tempfile::tempdir().unwrap();
        let request = Request {
            id: uuid::Uuid::new_v4().to_string(),
            session_id: uuid::Uuid::new_v4().to_string(),
            turn_id: uuid::Uuid::new_v4().to_string(),
            questions: vec![],
        };
        assert_eq!(
            ask(&directory.path().join("missing"), &request),
            Reply::Unavailable
        );
    }
}
