use crate::runtime_paths::RuntimePaths;
use serde::{Deserialize, Serialize};
use std::io::{BufRead, BufReader};
use std::path::PathBuf;
use std::process::{ChildStdin, Stdio};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc, Mutex, mpsc};
use std::time::Duration;

#[derive(Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Connection {
    pub url: String,
    pub token: String,
    pub session_id: String,
    pub pid: u32,
    pub version: u32,
}

#[derive(Clone, Serialize)]
pub struct Attachment {
    pub connection: Connection,
    pub workspace: PathBuf,
    pub owned: bool,
}

pub struct Backend {
    pub attachment: Attachment,
    pub closing: AtomicBool,
    pub exiting: AtomicBool,
    runtime: RuntimePaths,
    // EOF is the parent's lifetime signal, including an unexpected application exit.
    input: Mutex<Option<ChildStdin>>,
}

impl Backend {
    pub fn start(
        runtime: RuntimePaths,
        workspace: PathBuf,
        origin: Option<String>,
        file: Option<PathBuf>,
    ) -> Result<Arc<Self>, String> {
        std::fs::create_dir_all(&workspace).map_err(|error| error.to_string())?;
        let workspace = workspace
            .canonicalize()
            .map_err(|error| error.to_string())?;
        let mut command = runtime.command();
        command
            .args(["start", "--cli", "--parent-stdio", "--workspace"])
            .arg(&workspace);
        if let Some(origin) = origin {
            command.args(["--native-origin", &origin]);
        }
        if let Some(file) = file {
            command.arg("--file").arg(file);
        }
        let mut child = command
            .stdin(Stdio::piped())
            .stdout(Stdio::piped())
            .stderr(Stdio::piped())
            .spawn()
            .map_err(|error| format!("Poffo backend: {error}"))?;
        let input = child.stdin.take();
        let output = child.stdout.take().ok_or("Backend stdout is unavailable")?;
        let errors = Arc::new(Mutex::new(String::new()));
        if let Some(stderr) = child.stderr.take() {
            let errors = errors.clone();
            std::thread::spawn(move || {
                for line in BufReader::new(stderr).lines().map_while(Result::ok) {
                    if let Ok(mut text) = errors.lock() {
                        *text = line.chars().take(4000).collect();
                    }
                }
            });
        }
        let (send, receive) = mpsc::channel();
        std::thread::spawn(move || {
            for line in BufReader::new(output).lines().map_while(Result::ok) {
                if let Ok(value) = serde_json::from_str::<serde_json::Value>(&line) {
                    if value["ready"] == true || value["connected"] == true {
                        let _ = send.send(value["ready"] == true);
                    }
                }
            }
        });
        let owned = match receive.recv_timeout(Duration::from_secs(30)) {
            Ok(owned) => owned,
            Err(error) => {
                drop(input);
                let _ = child.kill();
                let _ = child.wait();
                return Err(format!(
                    "Backend startup failed: {error}; {}",
                    errors.lock().map(|text| text.clone()).unwrap_or_default()
                ));
            }
        };
        let connection: Connection = serde_json::from_slice(
            &std::fs::read(workspace.join(".poffo/connection.json"))
                .map_err(|error| error.to_string())?,
        )
        .map_err(|error| error.to_string())?;
        if owned && connection.pid != child.id() {
            return Err("Backend process identity mismatch".into());
        }
        std::thread::spawn(move || {
            let _ = child.wait();
        });
        Ok(Arc::new(Self {
            attachment: Attachment {
                connection,
                workspace,
                owned,
            },
            runtime,
            input: Mutex::new(input),
            closing: AtomicBool::new(false),
            exiting: AtomicBool::new(false),
        }))
    }

    pub fn stop(&self, discard: bool) -> Result<(), String> {
        if !self.attachment.owned {
            return Ok(());
        }
        let mut command = self.runtime.command();
        command
            .args(["stop", "--workspace"])
            .arg(&self.attachment.workspace);
        if discard {
            command.arg("--discard");
        }
        let output = command.output().map_err(|error| error.to_string())?;
        if output.status.success() {
            self.input.lock().map_err(|error| error.to_string())?.take();
            return Ok(());
        }
        let error = String::from_utf8_lossy(&output.stderr);
        if error.contains("unsaved-document:") {
            return Err("unsaved-document".into());
        }
        Err("백엔드를 종료하지 못했습니다. 파일 저장 상태를 확인하세요.".into())
    }

    pub fn install_cli(&self) -> Result<serde_json::Value, String> {
        let output = self
            .runtime
            .command()
            .arg("install-cli")
            .output()
            .map_err(|error| error.to_string())?;
        if !output.status.success() {
            return Err("CLI를 설치하지 못했습니다. 기존 poffo 명령이 있는지 확인하세요.".into());
        }
        serde_json::from_slice(&output.stdout).map_err(|error| error.to_string())
    }

    pub fn allow_exit(&self) {
        self.exiting.store(true, Ordering::SeqCst);
    }
}
