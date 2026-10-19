use super::{Reply, Request, registration};
use crate::codex::{AppHandle, Bridge, Manager, Webview, publish, server};
use std::{collections::BTreeMap, net::TcpStream, time::Duration};

fn publish_later(app: &AppHandle) {
    let handle = app.clone();
    let _ = app.run_on_main_thread(move || publish(&handle));
}

pub fn receive(app: &AppHandle, stream: &mut TcpStream, request: Request) {
    let receiver = request.validate().ok().and_then(|()| {
        let bridge = app.state::<Bridge>();
        let mut runtime = bridge.0.lock().ok()?;
        if !runtime.registered
            || !runtime.questions_enabled
            || !runtime.widgets.values().any(|speech| speech.enabled)
            || !runtime
                .activities
                .current_turn(&request.session_id, &request.turn_id)
        {
            return None;
        }
        let receiver = runtime.questions.insert(request.clone()).ok()?;
        runtime
            .activities
            .question(&request.session_id, &request.turn_id);
        Some(receiver)
    });
    publish_later(app);
    let reply = receiver
        .and_then(|receiver| receiver.recv_timeout(Duration::from_secs(120)).ok())
        .unwrap_or(Reply::Unavailable);
    server::respond_question(stream, &reply);
    if let Ok(mut runtime) = app.state::<Bridge>().0.lock() {
        runtime.questions.cancel(&request.id);
        if !runtime
            .questions
            .list()
            .iter()
            .any(|other| other.session_id == request.session_id)
        {
            runtime
                .activities
                .question_ended(&request.session_id, &request.turn_id);
        }
    }
    publish_later(app);
}

pub fn cancel(app: &AppHandle, id: &str) {
    if uuid::Uuid::parse_str(id).is_err() {
        return;
    }
    if let Ok(mut runtime) = app.state::<Bridge>().0.lock() {
        runtime.questions.cancel(id);
    }
    publish_later(app);
}

#[tauri::command]
pub fn answer_codex_question(
    app: AppHandle,
    caller: Webview,
    request_id: String,
    answers: BTreeMap<String, String>,
) -> Result<(), String> {
    let widget = caller
        .label()
        .strip_prefix("poffo-bubble-")
        .ok_or("Only speech windows can answer questions")?;
    let bridge = app.state::<Bridge>();
    let mut runtime = bridge.0.lock().map_err(|error| error.to_string())?;
    if !runtime
        .widgets
        .get(widget)
        .is_some_and(|speech| speech.enabled)
    {
        return Err("알림 위젯이 닫혔습니다.".into());
    }
    runtime.questions.answer(&request_id, answers)?;
    drop(runtime);
    publish(&app);
    Ok(())
}

#[tauri::command]
pub async fn configure_codex_questions(
    app: AppHandle,
    caller: Webview,
    enabled: bool,
) -> Result<crate::codex::Snapshot, String> {
    crate::codex::require_manager(&caller)?;
    let handle = app.clone();
    tauri::async_runtime::spawn_blocking(move || {
        let bridge = handle.state::<Bridge>();
        let mut runtime = bridge.0.lock().map_err(|error| error.to_string())?;
        if enabled && !runtime.registered {
            return Err("Codex 알림을 먼저 연결해 주세요.".into());
        }
        registration::configure(
            &runtime.config,
            &runtime.helper,
            &runtime.descriptor,
            enabled,
        )?;
        runtime.questions_enabled =
            registration::registered(&runtime.config, &runtime.helper, &runtime.descriptor)?;
        if !enabled {
            runtime.questions.clear();
        }
        Ok::<_, String>(())
    })
    .await
    .map_err(|error| error.to_string())??;
    publish(&app);
    crate::codex::codex_bridge_status(app, caller)
}
