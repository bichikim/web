use super::activity::HookEvent;
use std::{
    io::{Read, Write},
    net::TcpStream,
    time::Duration,
};
const MAX_EVENT_BYTES: usize = 524_288;
#[derive(serde::Deserialize)]
#[serde(untagged)]
pub enum Incoming {
    Question {
        question: super::questions::Request,
    },
    Cancel {
        #[serde(rename = "cancelQuestion")]
        id: String,
    },
    Event(HookEvent),
}

pub fn read_message(stream: &mut TcpStream, token: &str) -> Result<Incoming, String> {
    stream
        .set_read_timeout(Some(Duration::from_millis(200)))
        .map_err(|error| error.to_string())?;
    let mut request = Vec::new();
    let boundary = loop {
        if request.len() >= 8192 {
            return Err("Request is too large".into());
        }
        let mut byte = [0];
        stream
            .read_exact(&mut byte)
            .map_err(|error| error.to_string())?;
        request.push(byte[0]);
        if request.ends_with(b"\r\n\r\n") {
            break request.len();
        }
    };
    let header = std::str::from_utf8(&request).map_err(|error| error.to_string())?;
    if !header.starts_with("POST /events HTTP/1.1\r\n") {
        return Err("Unsupported request".into());
    }
    let fields: Vec<_> = header
        .lines()
        .filter_map(|line| line.split_once(':'))
        .map(|(key, value)| (key.to_ascii_lowercase(), value.trim()))
        .collect();
    let authorization = format!("Bearer {token}");
    if !fields
        .iter()
        .any(|(key, value)| key == "authorization" && *value == authorization)
    {
        return Err("Invalid authorization".into());
    }
    if !fields
        .iter()
        .any(|(key, value)| key == "content-type" && *value == "application/json")
    {
        return Err("Invalid content type".into());
    }
    let length: usize = fields
        .iter()
        .find(|(key, _)| key == "content-length")
        .ok_or("Missing length")?
        .1
        .parse()
        .map_err(|_| "Invalid length")?;
    if length == 0 || length > MAX_EVENT_BYTES {
        return Err("Invalid event size".into());
    }
    request.resize(boundary + length, 0);
    stream
        .read_exact(&mut request[boundary..])
        .map_err(|error| error.to_string())?;
    let incoming: Incoming =
        serde_json::from_slice(&request[boundary..]).map_err(|error| error.to_string())?;
    if let Incoming::Event(event) = &incoming
        && (!super::hooks::EVENTS.contains(&event.hook_event_name.as_str())
            || event.session_id.is_empty()
            || event.session_id.len() > 128)
    {
        return Err("Invalid event".into());
    }
    Ok(incoming)
}

#[cfg(test)]
pub fn read_event(stream: &mut TcpStream, token: &str) -> Result<HookEvent, String> {
    let Incoming::Event(event) = read_message(stream, token)? else {
        return Err("Expected event".into());
    };
    if !super::hooks::EVENTS.contains(&event.hook_event_name.as_str())
        || event.session_id.is_empty()
        || event.session_id.len() > 128
    {
        return Err("Invalid event".into());
    }
    Ok(event)
}

pub fn respond_question(stream: &mut TcpStream, reply: &super::questions::Reply) {
    let _ = stream.set_write_timeout(Some(Duration::from_millis(100)));
    if let Ok(body) = serde_json::to_string(reply) {
        let _ = write!(
            stream,
            "HTTP/1.1 200 OK\r\nContent-Type: application/json\r\nContent-Length: {}\r\nConnection: close\r\n\r\n{body}",
            body.len()
        );
    }
}

pub fn respond_decision(
    stream: &mut TcpStream,
    decision: super::approvals::Decision,
) -> std::io::Result<()> {
    stream.set_write_timeout(Some(Duration::from_millis(100)))?;
    let body = serde_json::to_string(&decision)?;
    write!(
        stream,
        "HTTP/1.1 200 OK\r\nContent-Type: application/json\r\nContent-Length: {}\r\nConnection: close\r\n\r\n{body}",
        body.len()
    )
}

pub fn respond(stream: &mut TcpStream, accepted: bool) {
    let _ = stream.set_write_timeout(Some(Duration::from_millis(100)));
    let status = if accepted {
        "204 No Content"
    } else {
        "400 Bad Request"
    };
    let _ = write!(
        stream,
        "HTTP/1.1 {status}\r\nContent-Length: 0\r\nConnection: close\r\n\r\n"
    );
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::net::TcpListener;

    fn request(authorization: &str, length: usize, body: &str) -> Result<HookEvent, String> {
        let listener = TcpListener::bind("127.0.0.1:0").unwrap();
        let mut client = TcpStream::connect(listener.local_addr().unwrap()).unwrap();
        write!(client, "POST /events HTTP/1.1\r\nAuthorization: Bearer {authorization}\r\nContent-Type: application/json\r\nContent-Length: {length}\r\n\r\n{body}").unwrap();
        let (mut server, _) = listener.accept().unwrap();
        read_event(&mut server, "private-token")
    }

    #[test]
    fn rejects_unauthenticated_and_oversized_events() {
        assert_eq!(
            request("wrong", 1, "x").unwrap_err(),
            "Invalid authorization"
        );
        assert_eq!(
            request("private-token", MAX_EVENT_BYTES + 1, "").unwrap_err(),
            "Invalid event size"
        );
    }

    #[test]
    fn accepts_long_utf8_response_text() {
        let response = "한".repeat(3000);
        let body = serde_json::json!({"hook_event_name":"Stop", "session_id":"chat",
            "emitted_at":1, "response":response})
        .to_string();
        let event = request("private-token", body.len(), &body).unwrap();
        assert_eq!(event.response.as_deref(), Some(response.as_str()));
    }
    #[test]
    fn accepts_supported_metadata_and_rejects_unknown_events() {
        let body =
            r#"{"hook_event_name":"Stop","session_id":"session","turn_id":"turn","emitted_at":1}"#;
        assert_eq!(
            request("private-token", body.len(), body)
                .unwrap()
                .hook_event_name,
            "Stop"
        );
        let unknown = body.replace("Stop", "Unknown");
        assert_eq!(
            request("private-token", unknown.len(), &unknown).unwrap_err(),
            "Invalid event"
        );
    }
}
