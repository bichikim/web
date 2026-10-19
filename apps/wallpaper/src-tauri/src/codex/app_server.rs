use serde_json::{Value, json};
use std::{
    io::{BufRead, BufReader, Read, Write},
    path::PathBuf,
    process::{Child, ChildStdin, Command, Stdio},
    sync::mpsc::{self, Receiver},
    time::{Duration, Instant},
};

pub(super) struct Client {
    child: Child,
    input: ChildStdin,
    replies: Receiver<Result<Value, String>>,
    home: Option<tempfile::TempDir>,
    realtime_ready: bool,
}

impl Drop for Client {
    fn drop(&mut self) {
        let _ = self.child.kill();
        let _ = self.child.wait();
    }
}

pub(super) fn executable() -> Result<PathBuf, String> {
    #[cfg(target_os = "macos")]
    for application in ["ChatGPT", "Codex"] {
        let path = PathBuf::from(format!(
            "/Applications/{application}.app/Contents/Resources/codex-cli/CodexCLI.app/Contents/MacOS/codex"
        ));
        if path.is_file() {
            return Ok(path);
        }
    }
    let name = if cfg!(windows) { "codex.exe" } else { "codex" };
    std::env::var_os("PATH")
        .and_then(|paths| {
            std::env::split_paths(&paths)
                .map(|directory| directory.join(name))
                .find(|path| path.is_file())
        })
        .ok_or("Codex CLI is unavailable".into())
}

impl Client {
    pub(super) fn connect_voice(auth: &std::path::Path) -> Result<Self, String> {
        let home = tempfile::tempdir().map_err(|error| error.to_string())?;
        #[cfg(unix)]
        std::os::unix::fs::symlink(auth, home.path().join("auth.json"))
            .map_err(|error| error.to_string())?;
        #[cfg(windows)]
        std::fs::hard_link(auth, home.path().join("auth.json"))
            .map_err(|error| error.to_string())?;
        std::fs::write(home.path().join("config.toml"), "web_search = \"disabled\"\n[features]\nrealtime_conversation = true\nshell_tool = false\nunified_exec = false\nhooks = false\napps = false\nplugins = false\n").map_err(|error| error.to_string())?;
        let mut client = Self::spawn(Some(home))?;
        client.call(
            0,
            "initialize",
            json!({
                "clientInfo":{"name":"poffo_voice","version":"0.1.0"},
                "capabilities":{"experimentalApi":true}
            }),
        )?;
        client.send(json!({"method":"initialized","params":{}}))?;
        Ok(client)
    }
    fn connect() -> Result<Self, String> {
        let mut client = Self::start()?;
        client.call(
            0,
            "initialize",
            json!({"clientInfo": {
                "name":"poffo_wallpaper", "title":"Poffo", "version":"0.1.0"
            }}),
        )?;
        client.send(json!({"method":"initialized", "params":{}}))?;
        Ok(client)
    }
    fn start() -> Result<Self, String> {
        Self::spawn(None)
    }
    fn spawn(home: Option<tempfile::TempDir>) -> Result<Self, String> {
        let mut command = Command::new(executable()?);
        command.args(["app-server", "--listen", "stdio://"]);
        if let Some(home) = &home {
            command
                .env("CODEX_HOME", home.path())
                .current_dir(home.path());
        }
        let mut child = command
            .stdin(Stdio::piped())
            .stdout(Stdio::piped())
            .stderr(Stdio::null())
            .spawn()
            .map_err(|error| error.to_string())?;
        let input = child.stdin.take().ok_or("Missing Codex input")?;
        let output = child.stdout.take().ok_or("Missing Codex output")?;
        let (sender, replies) = mpsc::channel();
        std::thread::spawn(move || {
            let mut reader = BufReader::new(output);
            loop {
                let mut line = String::new();
                let read = reader.by_ref().take(1_048_576).read_line(&mut line);
                let result = match read {
                    Ok(0) => break,
                    Ok(_) if !line.ends_with('\n') => {
                        Err("Codex response exceeded its limit".into())
                    }
                    Ok(_) => serde_json::from_str(&line).map_err(|error| error.to_string()),
                    Err(error) => Err(error.to_string()),
                };
                if sender.send(result).is_err() {
                    break;
                }
            }
        });
        Ok(Self {
            child,
            input,
            replies,
            home,
            realtime_ready: false,
        })
    }

    fn send(&mut self, value: Value) -> Result<(), String> {
        serde_json::to_writer(&mut self.input, &value).map_err(|error| error.to_string())?;
        self.input
            .write_all(b"\n")
            .and_then(|_| self.input.flush())
            .map_err(|error| error.to_string())
    }

    fn receive(&mut self, deadline: Instant) -> Result<Value, String> {
        let value = self
            .replies
            .recv_timeout(deadline.saturating_duration_since(Instant::now()))
            .map_err(|error| error.to_string())??;
        if self.home.is_some() {
            if value["method"] == "thread/realtime/started" {
                self.realtime_ready = true;
            }
            if value["method"] == "thread/realtime/error"
                || value["method"] == "thread/realtime/closed"
            {
                return Err("Realtime session is unavailable".into());
            }
            if value.get("method").is_some() && value.get("id").is_some() {
                self.send(json!({"id":value["id"],"error":{"code":-32601,"message":"Unavailable in speech-only session"}}))?;
            }
            if value["method"] == "turn/started" {
                self.send(json!({"id":u64::MAX,"method":"turn/interrupt","params":{
                    "threadId":value["params"]["threadId"],"turnId":value["params"]["turn"]["id"]
                }}))?;
                return Err("Unexpected task in speech-only session".into());
            }
        }
        Ok(value)
    }

    pub(super) fn wait_realtime_ready(&mut self) -> Result<(), String> {
        let deadline = Instant::now() + Duration::from_secs(25);
        while !self.realtime_ready {
            self.receive(deadline)?;
        }
        Ok(())
    }

    pub(super) fn call(&mut self, id: u64, method: &str, params: Value) -> Result<Value, String> {
        self.send(json!({"id": id, "method": method, "params": params}))?;
        let deadline =
            Instant::now() + Duration::from_secs(if self.home.is_some() { 25 } else { 2 });
        loop {
            let value = self.receive(deadline)?;
            if value.get("id").and_then(Value::as_u64) == Some(id) {
                return value
                    .get("result")
                    .cloned()
                    .ok_or_else(|| format!("Codex {method} failed"));
            }
        }
    }
}

pub fn thread_title(session: &str) -> Result<Option<String>, String> {
    if uuid::Uuid::parse_str(session).is_err() {
        return Err("Invalid Codex chat".into());
    }
    let mut client = Client::connect()?;
    let value = client.call(
        1,
        "thread/read",
        json!({"threadId": session, "includeTurns": false}),
    )?;
    Ok(value
        .get("thread")
        .and_then(|thread| thread.get("name"))
        .and_then(Value::as_str)
        .map(str::trim)
        .filter(|name| !name.is_empty())
        .map(|name| name.chars().take(256).collect()))
}

pub fn thread_progress(session: &str, turn: &str) -> Result<Option<String>, String> {
    if uuid::Uuid::parse_str(session).is_err() || uuid::Uuid::parse_str(turn).is_err() {
        return Err("Invalid Codex chat or turn".into());
    }
    let mut client = Client::connect()?;
    let mut cursor = Value::Null;
    for page in 1..=2 {
        let result = client.call(
            page,
            "thread/items/list",
            json!({
                "threadId":session, "turnId":turn, "sortDirection":"desc", "limit":32,
                "cursor":cursor,
            }),
        )?;
        if let Some(text) = progress_text(&result, turn) {
            return Ok(Some(text));
        }
        cursor = result.get("nextCursor").cloned().unwrap_or(Value::Null);
        if !cursor.is_string() {
            return Ok(None);
        }
    }
    Ok(None)
}

fn progress_text(result: &Value, turn: &str) -> Option<String> {
    result.get("data")?.as_array()?.iter().find_map(|entry| {
        let item = &entry["item"];
        if entry["turnId"].as_str() != Some(turn)
            || item["type"].as_str() != Some("agentMessage")
            || item["phase"].as_str() != Some("commentary")
        {
            return None;
        }
        let text = item["text"].as_str()?.trim();
        (!text.is_empty()).then(|| text.chars().take(2000).collect())
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[cfg(unix)]
    fn voice_client(messages: Vec<Value>) -> Client {
        let mut child = Command::new("cat")
            .stdin(Stdio::piped())
            .stdout(Stdio::null())
            .spawn()
            .unwrap();
        let input = child.stdin.take().unwrap();
        let (sender, replies) = mpsc::channel();
        for message in messages {
            sender.send(Ok(message)).unwrap();
        }
        Client {
            child,
            input,
            replies,
            home: Some(tempfile::tempdir().unwrap()),
            realtime_ready: false,
        }
    }

    #[cfg(unix)]
    #[test]
    fn waits_for_sideband_readiness_after_the_rpc_acknowledgement() {
        let mut client = voice_client(vec![
            json!({"id":2,"result":{}}),
            json!({"method":"thread/realtime/started","params":{"threadId":"speech"}}),
        ]);
        client.call(2, "thread/realtime/start", json!({})).unwrap();
        assert!(!client.realtime_ready);
        client.wait_realtime_ready().unwrap();
        assert!(client.realtime_ready);
    }

    #[cfg(unix)]
    #[test]
    fn retains_readiness_that_arrives_before_the_rpc_acknowledgement() {
        let mut client = voice_client(vec![
            json!({"method":"thread/realtime/started","params":{"threadId":"speech"}}),
            json!({"id":2,"result":{}}),
        ]);
        client.call(2, "thread/realtime/start", json!({})).unwrap();
        client.wait_realtime_ready().unwrap();
        assert!(client.realtime_ready);
    }

    #[cfg(unix)]
    #[test]
    fn rejects_a_sideband_that_closes_instead_of_becoming_ready() {
        let mut client = voice_client(vec![
            json!({"method":"thread/realtime/closed","params":{"threadId":"speech"}}),
        ]);
        assert!(client.wait_realtime_ready().is_err());
        assert!(!client.realtime_ready);
    }

    #[test]
    fn reads_only_the_latest_public_progress_for_the_requested_turn() {
        let result = json!({"data":[
            {"turnId":"old", "item":{"type":"agentMessage","phase":"commentary","text":"old chat text"}},
            {"turnId":"turn", "item":{"type":"reasoning","summary":["private"],"content":["private"]}},
            {"turnId":"turn", "item":{"type":"agentMessage","phase":"final_answer","text":"final"}},
            {"turnId":"turn", "item":{"type":"agentMessage","phase":"commentary","text":"  최신 진행\n둘째 줄  "}},
            {"turnId":"turn", "item":{"type":"agentMessage","phase":"commentary","text":"이전 진행"}}
        ]});
        assert_eq!(
            progress_text(&result, "turn").as_deref(),
            Some("최신 진행\n둘째 줄")
        );
        assert!(progress_text(&result, "missing").is_none());
    }

    #[test]
    fn bounds_public_text_and_ignores_missing_or_empty_content() {
        let result = json!({"data":[
            {"turnId":"turn", "item":{"type":"agentMessage","phase":"commentary","text":" "}},
            {"turnId":"turn", "item":{"type":"agentMessage","text":"no phase"}},
            {"turnId":"turn", "item":{"type":"agentMessage","phase":"commentary","text":"가".repeat(3000)}}
        ]});
        assert_eq!(progress_text(&result, "turn").unwrap(), "가".repeat(2000));
        assert!(progress_text(&json!({}), "turn").is_none());
    }
}
