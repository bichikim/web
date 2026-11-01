pub mod activity;
mod app_server;
mod approvals;
pub mod bubble;
pub mod chat;
pub mod decision;
mod files;
mod hooks;
mod progress;
pub mod prompt;
pub mod questions;
mod receipts;
pub mod relay;
mod reviewer;
mod server;
pub mod signals;
mod tool_failure;
mod visibility;
pub mod voice;

use activity::{Activities, Activity, HookEvent};
use hooks::Registration;
use serde::{Deserialize, Serialize};
use std::{
    collections::BTreeMap,
    fs,
    net::TcpListener,
    path::PathBuf,
    sync::{Arc, Mutex},
};
use tauri::{AppHandle, Emitter, Manager, Webview};

const EVENT: &str = "poffo-codex-state";

#[derive(Clone, Deserialize, Serialize)]
pub struct Connection {
    pub port: u16,
    pub token: String,
    pub hooks_path: PathBuf,
    pub registration: Option<Registration>,
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Snapshot {
    registered: bool,
    received: bool,
    activity: Option<Activity>,
    recent: Vec<HookEvent>,
    sessions: Vec<Activity>,
    approvals: Vec<approvals::Request>,
    approval_enabled: bool,
    questions: Vec<questions::Request>,
    questions_enabled: bool,
}

#[derive(Default)]
struct Runtime {
    progress: progress::Queries,
    connection: Option<Connection>,
    descriptor: PathBuf,
    helper: PathBuf,
    registered: bool,
    activities: Activities,
    recent: Vec<HookEvent>,
    widgets: BTreeMap<String, bubble::Speech>,
    visibility: visibility::Visibility,
    approvals: approvals::Pending,
    decisions: receipts::Receipts,
    questions: questions::Pending,
    questions_enabled: bool,
    config: PathBuf,
    approval_enabled: bool,
}
#[derive(Clone, Default)]
pub struct Bridge(Arc<Mutex<Runtime>>);

fn snapshot(runtime: &Runtime) -> Snapshot {
    Snapshot {
        registered: runtime.registered,
        received: !runtime.recent.is_empty(),
        activity: runtime.activities.current(),
        recent: runtime.recent.clone(),
        sessions: runtime
            .activities
            .sessions()
            .into_iter()
            .map(|mut activity| {
                if runtime.questions.contains_session(&activity.session_id) {
                    activity.phase = "question".into();
                    activity.text = "질문에 답해 주세요.".into();
                    activity.tool = None;
                }
                activity
            })
            .collect(),
        approvals: runtime.approvals.list(),
        approval_enabled: runtime.approval_enabled,
        questions: runtime.questions.list(),
        questions_enabled: runtime.questions_enabled,
    }
}

fn widget_snapshot(runtime: &Runtime, widget: &str) -> Snapshot {
    let mut value = snapshot(runtime);
    value
        .sessions
        .retain(|item| runtime.visibility.visible(widget, item));
    value
}

fn publish(app: &AppHandle) {
    let bridge = app.state::<Bridge>();
    let Ok(mut runtime) = bridge.0.lock() else {
        return;
    };
    let visible = runtime
        .activities
        .sessions()
        .into_iter()
        .filter(|activity| {
            runtime
                .widgets
                .iter()
                .any(|(id, speech)| speech.enabled && runtime.visibility.visible(id, activity))
        })
        .map(|activity| activity.session_id)
        .collect();
    runtime.approvals.retain(&visible);
    runtime.questions.retain(&visible);
    let snapshot = snapshot(&runtime);
    let signals = signals::from_snapshot(&snapshot);
    let widgets: Vec<_> = runtime
        .widgets
        .iter()
        .map(|(id, speech)| (id.clone(), speech.clone(), widget_snapshot(&runtime, id)))
        .collect();
    drop(runtime);
    let _ = app.emit_to("manager", EVENT, &snapshot);
    let _ = app.emit_to("manager", signals::EVENT, &signals);
    for (id, speech, snapshot) in widgets {
        let _ = app.emit_to(format!("poffo-widget-{id}"), signals::EVENT, &signals);
        if let Err(error) = bubble::synchronize(
            app,
            &id,
            &speech,
            snapshot.registered && snapshot.sessions.iter().any(|item| item.phase != "idle"),
        ) {
            eprintln!("Poffo speech unavailable: {error}");
            if let Ok(mut runtime) = bridge.0.lock() {
                runtime.approvals.clear();
                runtime.questions.clear();
            }
        }
        let _ = app.emit_to(format!("poffo-bubble-{id}"), EVENT, &snapshot);
    }
}

fn accept(
    app: &AppHandle,
    event: HookEvent,
) -> Option<std::sync::mpsc::Receiver<approvals::Decision>> {
    let bridge = app.state::<Bridge>();
    let Ok(mut runtime) = bridge.0.lock() else {
        return None;
    };
    if !runtime.registered || !runtime.activities.receive(&event) {
        return None;
    }
    if matches!(
        event.hook_event_name.as_str(),
        "Stop" | "Interrupt" | "UserPromptSubmit"
    ) {
        runtime.approvals.cancel_session(&event.session_id);
        runtime.questions.cancel_session(&event.session_id);
    }
    let receiver = if runtime.widgets.values().any(|speech| speech.enabled) {
        event
            .approval
            .as_ref()
            .filter(|_| event.hook_event_name == "PermissionRequest")
            .and_then(|input| {
                runtime.approvals.insert(approvals::Request {
                    id: input.id.clone(),
                    session_id: event.session_id.clone(),
                    turn_id: event.turn_id.clone(),
                    tool: event.tool_name.clone().unwrap_or_default(),
                    cwd: input.cwd.clone(),
                    input: input.input.clone(),
                })
            })
    } else {
        None
    };
    let activities = runtime.activities.sessions();
    runtime.visibility.retain(&activities);
    let progress_event = event.clone();
    let mut receipt = event;
    receipt.response = None;
    receipt.approval = None;
    runtime.recent.push(receipt);
    if runtime.recent.len() > 32 {
        runtime.recent.remove(0);
    }
    drop(runtime);
    progress::refresh(app, &progress_event);
    let handle = app.clone();
    let _ = app.run_on_main_thread(move || publish(&handle));
    receiver
}

pub fn start(app: &AppHandle) -> Result<(), String> {
    let directory = app
        .path()
        .app_local_data_dir()
        .map_err(|error| error.to_string())?
        .join("codex");
    let descriptor = directory.join("connection.json");
    let helper = directory.join(if cfg!(windows) {
        "poffo-codex-hook.exe"
    } else {
        "poffo-codex-hook"
    });
    let previous: Option<Connection> = fs::read(&descriptor)
        .ok()
        .and_then(|bytes| serde_json::from_slice(&bytes).ok());
    let listener = TcpListener::bind("127.0.0.1:0").map_err(|error| error.to_string())?;
    let codex_home = std::env::var_os("CODEX_HOME").map(PathBuf::from).unwrap_or(
        app.path()
            .home_dir()
            .map_err(|error| error.to_string())?
            .join(".codex"),
    );
    let connection = Connection {
        port: listener
            .local_addr()
            .map_err(|error| error.to_string())?
            .port(),
        token: uuid::Uuid::new_v4().to_string(),
        hooks_path: previous
            .as_ref()
            .map(|connection| connection.hooks_path.clone())
            .unwrap_or(codex_home.join("hooks.json")),
        registration: previous.and_then(|connection| connection.registration),
    };
    let source = files::read_json(&connection.hooks_path)?.1;
    let registered = connection
        .registration
        .as_ref()
        .is_some_and(|registration| hooks::installed(&source, registration));
    if registered {
        files::copy_executable(
            &std::env::current_exe().map_err(|error| error.to_string())?,
            &helper,
        )?;
    }
    if descriptor.exists() {
        files::write(
            &descriptor,
            &serde_json::to_vec_pretty(&connection).map_err(|error| error.to_string())?,
        )?;
    }
    let bridge = app.state::<Bridge>();
    {
        let mut runtime = bridge.0.lock().map_err(|error| error.to_string())?;
        runtime.connection = Some(connection.clone());
        runtime.descriptor = descriptor;
        runtime.helper = helper;
        runtime.config = codex_home.join("config.toml");
        runtime.questions_enabled = questions::registration::available(
            &runtime.config,
            &runtime.helper,
            &runtime.descriptor,
        );
        runtime.registered = registered;
        runtime.approval_enabled = connection
            .registration
            .as_ref()
            .is_some_and(|registration| hooks::interactive(&source, registration));
    }
    let handle = app.clone();
    std::thread::spawn(move || {
        for incoming in listener.incoming() {
            let Ok(mut stream) = incoming else { break };
            let app = handle.clone();
            let token = connection.token.clone();
            std::thread::spawn(move || decision::receive(&app, &mut stream, &token));
        }
    });
    Ok(())
}

fn require_manager(caller: &Webview) -> Result<(), String> {
    if caller.label() == "manager" {
        Ok(())
    } else {
        Err("Only settings can configure Codex notifications".into())
    }
}

#[tauri::command]
pub fn codex_bridge_status(app: AppHandle, caller: Webview) -> Result<Snapshot, String> {
    if caller.label() != "manager" && !caller.label().starts_with("poffo-bubble-") {
        return Err("Unsupported notification surface".into());
    }
    let bridge = app.state::<Bridge>();
    let mut runtime = bridge.0.lock().map_err(|error| error.to_string())?;
    let registered = match &runtime.connection {
        Some(connection) => match &connection.registration {
            Some(registration) => {
                hooks::installed(&files::read_json(&connection.hooks_path)?.1, registration)
            }
            None => false,
        },
        None => false,
    };
    let changed = runtime.registered != registered;
    runtime.questions_enabled =
        questions::registration::available(&runtime.config, &runtime.helper, &runtime.descriptor);
    if !runtime.questions_enabled {
        runtime.questions.clear();
    }
    runtime.registered = registered;
    if !registered {
        runtime.activities = Activities::default();
        runtime.visibility = visibility::Visibility::default();
        runtime.approvals.clear();
        runtime.questions.clear();
        runtime.approval_enabled = false;
        runtime.recent.clear();
    }
    let value = match caller.label().strip_prefix("poffo-bubble-") {
        Some(widget) => widget_snapshot(&runtime, widget),
        None => snapshot(&runtime),
    };
    drop(runtime);
    if changed {
        publish(&app);
    }
    Ok(value)
}

#[tauri::command]
pub fn dismiss_poffo_speech(
    app: AppHandle,
    caller: Webview,
    session_id: String,
    notification_id: u64,
) -> Result<Snapshot, String> {
    let widget = caller
        .label()
        .strip_prefix("poffo-bubble-")
        .ok_or("Only speech windows can dismiss their notifications")?;
    let bridge = app.state::<Bridge>();
    let mut runtime = bridge.0.lock().map_err(|error| error.to_string())?;
    let activity = runtime
        .activities
        .sessions()
        .into_iter()
        .find(|item| item.session_id == session_id && item.notification_id == notification_id);
    if let Some(activity) = activity {
        runtime.visibility.hide(widget, &activity);
    }
    let value = widget_snapshot(&runtime, widget);
    drop(runtime);
    publish(&app);
    Ok(value)
}

#[tauri::command]
pub async fn codex_thread_title(
    app: AppHandle,
    caller: Webview,
    session_id: String,
) -> Result<Option<String>, String> {
    if !caller.label().starts_with("poffo-bubble-") && caller.label() != "manager" {
        return Err("Unsupported notification surface".into());
    }
    {
        let bridge = app.state::<Bridge>();
        let runtime = bridge.0.lock().map_err(|error| error.to_string())?;
        if !runtime
            .activities
            .sessions()
            .iter()
            .any(|item| item.session_id == session_id)
        {
            return Err("Unknown notification chat".into());
        }
    }
    tauri::async_runtime::spawn_blocking(move || app_server::thread_title(&session_id))
        .await
        .map_err(|error| error.to_string())?
}

#[tauri::command]
pub async fn connect_codex_notifications(
    app: AppHandle,
    caller: Webview,
) -> Result<Snapshot, String> {
    require_manager(&caller)?;
    let handle = app.clone();
    tauri::async_runtime::spawn_blocking(move || {
        let bridge = handle.state::<Bridge>();
        let mut runtime = bridge.0.lock().map_err(|error| error.to_string())?;
        let mut connection = runtime
            .connection
            .clone()
            .ok_or("Codex notification receiver is unavailable")?;
        let (previous, mut source) = files::read_json(&connection.hooks_path)?;
        if let Some(registration) = &connection.registration {
            source = hooks::uninstall(&source, registration)?;
        }
        let executable = std::env::current_exe().map_err(|error| error.to_string())?;
        files::copy_executable(&executable, &runtime.helper)?;
        let quote =
            |path: &std::path::Path| format!("'{}'", path.to_string_lossy().replace('\'', "'\\''"));
        let command = format!(
            "{} --poffo-codex-hook {}",
            quote(&runtime.helper),
            quote(&runtime.descriptor)
        );
        let command_windows = format!(
            "\"{}\" --poffo-codex-hook \"{}\"",
            runtime.helper.display(),
            runtime.descriptor.display()
        );
        let (updated, registration) = hooks::install(&source, command, command_windows)?;
        connection.registration = Some(registration);
        files::write(
            &runtime.descriptor,
            &serde_json::to_vec_pretty(&connection).map_err(|error| error.to_string())?,
        )?;
        files::replace_json(&connection.hooks_path, previous, &updated)?;
        runtime.connection = Some(connection);
        runtime.registered = true;
        runtime.approval_enabled = true;
        Ok::<_, String>(snapshot(&runtime))
    })
    .await
    .map_err(|error| error.to_string())??;
    publish(&app);
    codex_bridge_status(app, caller)
}

#[tauri::command]
pub async fn disconnect_codex_notifications(
    app: AppHandle,
    caller: Webview,
) -> Result<Snapshot, String> {
    require_manager(&caller)?;
    let handle = app.clone();
    tauri::async_runtime::spawn_blocking(move || {
        let bridge = handle.state::<Bridge>();
        let mut runtime = bridge.0.lock().map_err(|error| error.to_string())?;
        let mut connection = runtime
            .connection
            .clone()
            .ok_or("Codex notification receiver is unavailable")?;
        questions::registration::configure(
            &runtime.config,
            &runtime.helper,
            &runtime.descriptor,
            false,
        )?;
        if let Some(registration) = &connection.registration {
            let (previous, source) = files::read_json(&connection.hooks_path)?;
            files::replace_json(
                &connection.hooks_path,
                previous,
                &hooks::uninstall(&source, registration)?,
            )?;
        }
        connection.registration = None;
        files::write(
            &runtime.descriptor,
            &serde_json::to_vec_pretty(&connection).map_err(|error| error.to_string())?,
        )?;
        runtime.connection = Some(connection);
        runtime.registered = false;
        runtime.activities = Activities::default();
        runtime.visibility = visibility::Visibility::default();
        runtime.approvals.clear();
        runtime.questions.clear();
        runtime.questions_enabled = false;
        runtime.approval_enabled = false;
        runtime.recent.clear();
        // Already-loaded Codex sessions can still invoke the relay after the file is unregistered.
        Ok::<_, String>(())
    })
    .await
    .map_err(|error| error.to_string())??;
    publish(&app);
    codex_bridge_status(app, caller)
}

#[tauri::command]
pub fn resize_poffo_speech(app: AppHandle, caller: Webview, height: f64) -> Result<(), String> {
    let id = caller
        .label()
        .strip_prefix("poffo-bubble-")
        .ok_or("Only speech windows can resize their content")?;
    if !height.is_finite() || !(1.0..=16384.0).contains(&height) {
        return Err("Invalid speech height".into());
    }
    let bridge = app.state::<Bridge>();
    let speech = bridge
        .0
        .lock()
        .map_err(|error| error.to_string())?
        .widgets
        .get(id)
        .cloned();
    if let Some(speech) = speech {
        bubble::resize(&app, id, &speech, height)?;
    }
    Ok(())
}

#[tauri::command]
pub fn poffo_speech_target(
    app: AppHandle,
    caller: Webview,
) -> Result<Option<bubble::Target>, String> {
    let id = caller
        .label()
        .strip_prefix("poffo-bubble-")
        .ok_or("Only speech windows can read their character position")?;
    bubble::target(&app, id)
}

#[tauri::command]
pub fn move_poffo_speech(
    app: AppHandle,
    caller: Webview,
    x: f64,
    y: f64,
    anchor: Option<bubble::Anchor>,
) -> Result<(), String> {
    let id = caller
        .label()
        .strip_prefix("poffo-bubble-")
        .ok_or("Only speech windows can move their own bubble")?;
    if !x.is_finite() || !y.is_finite() || !(-1.0..=2.0).contains(&x) || !(-0.5..=1.5).contains(&y)
    {
        return Err("Invalid Poffo speech placement".into());
    }
    let bridge = app.state::<Bridge>();
    let mut runtime = bridge.0.lock().map_err(|error| error.to_string())?;
    let speech = runtime
        .widgets
        .get_mut(id)
        .ok_or("Poffo widget is unavailable")?;
    speech.x = x;
    speech.y = y;
    speech.anchor = anchor;
    let speech = speech.clone();
    drop(runtime);
    bubble::position(&app, id, &speech)
}

#[tauri::command]
pub fn configure_poffo_speech(
    app: AppHandle,
    caller: Webview,
    id: String,
    speech: bubble::Speech,
) -> Result<(), String> {
    require_manager(&caller)?;
    if uuid::Uuid::parse_str(&id).is_err()
        || !speech.x.is_finite()
        || !speech.y.is_finite()
        || !(-1.0..=2.0).contains(&speech.x)
        || !(-0.5..=1.5).contains(&speech.y)
    {
        return Err("Invalid Poffo speech placement".into());
    }
    let bridge = app.state::<Bridge>();
    let mut runtime = bridge.0.lock().map_err(|error| error.to_string())?;
    runtime.widgets.insert(id.clone(), speech.clone());
    let visible = runtime.registered
        && widget_snapshot(&runtime, &id)
            .sessions
            .iter()
            .any(|item| item.phase != "idle");
    drop(runtime);
    bubble::synchronize(&app, &id, &speech, visible)?;
    bubble::position(&app, &id, &speech)
}

pub fn moved(app: &AppHandle, label: &str) {
    // Bubble placement already emits its target; reacting to its own frame events feeds it back.
    let Some(id) = label.strip_prefix("poffo-widget-") else {
        return;
    };
    let bridge = app.state::<Bridge>();
    let speech = bridge
        .0
        .lock()
        .ok()
        .and_then(|runtime| runtime.widgets.get(id).cloned());
    if let Some(speech) = speech {
        let _ = bubble::position(app, id, &speech);
    }
}
pub fn removed(app: &AppHandle, label: &str) {
    let Some(id) = label.strip_prefix("poffo-widget-") else {
        return;
    };
    let bridge = app.state::<Bridge>();
    if let Ok(mut runtime) = bridge.0.lock() {
        runtime.widgets.remove(id);
        runtime.visibility.forget(id);
    }
    bubble::close(app, id);
    publish(app);
}
