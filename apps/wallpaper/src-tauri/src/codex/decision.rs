use super::{
    AppHandle, Bridge, Manager, Webview,
    approvals::{self, Decision},
    publish, server,
};
use std::{net::TcpStream, time::Duration};

pub fn receive(app: &AppHandle, stream: &mut TcpStream, token: &str) {
    let event = match server::read_message(stream, token) {
        Ok(server::Incoming::Event(event)) => event,
        Ok(server::Incoming::Question { question }) => {
            super::questions::runtime::receive(app, stream, question);
            return;
        }
        Ok(server::Incoming::Cancel { id }) => {
            super::questions::runtime::cancel(app, &id);
            server::respond(stream, true);
            return;
        }
        Err(_) => {
            server::respond(stream, false);
            return;
        }
    };
    let Some(input) = event.approval.as_ref() else {
        server::respond(stream, true);
        let _ = super::accept(app, event);
        return;
    };
    if uuid::Uuid::parse_str(&input.id).is_err()
        || event.hook_event_name != "PermissionRequest"
        || input.cwd.len() > 8192
        || input.input.to_string().len() > 65_536
    {
        server::respond(stream, false);
        return;
    }
    let id = input.id.clone();
    let decision = super::accept(app, event)
        .and_then(|receiver| receiver.recv_timeout(Duration::from_secs(120)).ok())
        .unwrap_or(Decision::Codex);
    let written = server::respond_decision(stream, decision).is_ok();
    if let Ok(mut runtime) = app.state::<Bridge>().0.lock() {
        runtime.approvals.cancel(&id);
        runtime.decisions.forwarded(&id, written);
        persist(&runtime);
    }
    let handle = app.clone();
    let _ = app.run_on_main_thread(move || publish(&handle));
}

#[tauri::command]
pub fn decide_codex_approval(
    app: AppHandle,
    caller: Webview,
    request_id: String,
    decision: approvals::Decision,
) -> Result<(), String> {
    let widget = caller
        .label()
        .strip_prefix("poffo-bubble-")
        .ok_or("Only speech windows can answer approvals")?;
    let bridge = app.state::<Bridge>();
    let mut runtime = bridge.0.lock().map_err(|error| error.to_string())?;
    if !runtime
        .widgets
        .get(widget)
        .is_some_and(|speech| speech.enabled)
    {
        return Err("알림 위젯이 닫혔습니다.".into());
    }
    let request = runtime.approvals.resolve(&request_id, decision)?;
    runtime.decisions.selected(&request, decision);
    persist(&runtime);
    drop(runtime);
    publish(&app);
    Ok(())
}

fn persist(runtime: &super::Runtime) {
    let path = runtime.descriptor.with_file_name("approval-decisions.json");
    let result = serde_json::to_vec(&runtime.decisions)
        .map_err(|error| error.to_string())
        .and_then(|body| super::files::write(&path, &body));
    if let Err(error) = result {
        eprintln!("Poffo approval receipt unavailable: {error}");
    }
}
