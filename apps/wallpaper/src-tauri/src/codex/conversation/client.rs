use super::Error;
use serde_json::{Value, json};
use std::{collections::VecDeque, path::PathBuf, process::Stdio, time::Duration};
use tokio::{
    io::{AsyncBufReadExt, AsyncWriteExt, BufReader},
    process::{Child, ChildStdin, ChildStdout, Command},
};

pub(super) struct Client {
    _child: Child,
    input: ChildStdin,
    output: BufReader<ChildStdout>,
    _home: tempfile::TempDir,
    next_id: u64,
    pending: VecDeque<Value>,
}

fn auth_path() -> Result<PathBuf, Error> {
    let home = std::env::var_os("CODEX_HOME")
        .map(PathBuf::from)
        .or_else(|| {
            std::env::var_os(if cfg!(windows) { "USERPROFILE" } else { "HOME" })
                .map(|home| PathBuf::from(home).join(".codex"))
        })
        .ok_or(Error::LoginRequired)?;
    let path = home.join("auth.json");
    path.is_file().then_some(path).ok_or(Error::LoginRequired)
}

impl Client {
    pub(super) async fn connect() -> Result<Self, Error> {
        let home = tempfile::tempdir().map_err(|_| Error::Unavailable)?;
        let auth = auth_path()?;
        #[cfg(unix)]
        std::os::unix::fs::symlink(&auth, home.path().join("auth.json"))
            .map_err(|_| Error::LoginRequired)?;
        #[cfg(windows)]
        std::fs::hard_link(&auth, home.path().join("auth.json"))
            .map_err(|_| Error::LoginRequired)?;
        std::fs::write(home.path().join("config.toml"),
            "web_search = \"disabled\"\n[features]\nshell_tool = false\nhooks = false\napps = false\nremote_plugin = false\nmulti_agent = false\ngoals = false\nmemories = false\nshell_snapshot = false\n")
            .map_err(|_| Error::Unavailable)?;
        let mut child =
            Command::new(super::super::app_server::executable().map_err(|_| Error::Unavailable)?)
                .args(["app-server", "--listen", "stdio://"])
                .env("CODEX_HOME", home.path())
                .current_dir(home.path())
                .stdin(Stdio::piped())
                .stdout(Stdio::piped())
                .stderr(Stdio::null())
                .kill_on_drop(true)
                .spawn()
                .map_err(|_| Error::Unavailable)?;
        let input = child.stdin.take().ok_or(Error::Unavailable)?;
        let output = BufReader::new(child.stdout.take().ok_or(Error::Unavailable)?);
        let mut client = Self {
            _child: child,
            input,
            output,
            _home: home,
            next_id: 0,
            pending: VecDeque::new(),
        };
        client
            .call(
                "initialize",
                json!({
                    "clientInfo":{"name":"poffo_conversation","title":"Poffo","version":"0.1.0"},
                    "capabilities":{"experimentalApi":true}
                }),
            )
            .await?;
        client
            .send(json!({"method":"initialized","params":{}}))
            .await?;
        Ok(client)
    }

    pub(super) async fn send(&mut self, value: Value) -> Result<(), Error> {
        let mut bytes = serde_json::to_vec(&value).map_err(|_| Error::Unavailable)?;
        bytes.push(b'\n');
        self.input
            .write_all(&bytes)
            .await
            .map_err(|_| Error::Unavailable)?;
        self.input.flush().await.map_err(|_| Error::Unavailable)
    }

    pub(super) async fn receive(&mut self) -> Result<Value, Error> {
        match self.pending.pop_front() {
            Some(value) => Ok(value),
            None => self.read().await,
        }
    }

    async fn read(&mut self) -> Result<Value, Error> {
        let mut line = String::new();
        let length = self
            .output
            .read_line(&mut line)
            .await
            .map_err(|_| Error::Unavailable)?;
        if length == 0 || length > 1_048_576 {
            return Err(Error::Unavailable);
        }
        let value: Value = serde_json::from_str(&line).map_err(|_| Error::Unavailable)?;
        if value.get("method").is_some() && value.get("id").is_some() {
            self.send(
                json!({"id":value["id"],"error":{"code":-32601,"message":"Conversation only"}}),
            )
            .await?;
        }
        Ok(value)
    }

    pub(super) async fn call(&mut self, method: &str, params: Value) -> Result<Value, Error> {
        let id = self.next_id;
        self.next_id += 1;
        self.send(json!({"id":id,"method":method,"params":params}))
            .await?;
        tokio::time::timeout(Duration::from_secs(30), async {
            loop {
                let value = self.read().await?;
                if value["id"].as_u64() == Some(id) {
                    return value.get("result").cloned().ok_or(Error::Unavailable);
                }
                if value.get("method").is_some() && value.get("id").is_none() {
                    self.pending.push_back(value);
                }
            }
        })
        .await
        .map_err(|_| Error::Unavailable)?
    }
}
