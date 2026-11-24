#[cfg(test)]
mod tests;

use std::sync::{
    Mutex,
    atomic::{AtomicBool, Ordering},
};
use tauri::{AppHandle, Emitter, Manager};
use tauri_plugin_global_shortcut::{Code, GlobalShortcutExt, Modifiers, Shortcut, ShortcutState};

const EVENT: &str = "poffo-microphone-toggle";
#[derive(Default)]
pub struct Target {
    recent: Mutex<Option<String>>,
    pressed: AtomicBool,
}
impl Target {
    fn trigger(&self, state: ShortcutState) -> bool {
        match state {
            ShortcutState::Pressed => !self.pressed.swap(true, Ordering::Relaxed),
            ShortcutState::Released => {
                self.pressed.store(false, Ordering::Relaxed);
                false
            }
        }
    }
}
struct SpeechWindow {
    label: String,
    visible: bool,
    focused: bool,
}
fn bubble_label(label: &str) -> Option<String> {
    label
        .strip_prefix("poffo-bubble-")
        .or_else(|| label.strip_prefix("poffo-widget-"))
        .filter(|id| !id.is_empty())
        .map(|id| format!("poffo-bubble-{id}"))
}
fn select_target(recent: Option<&str>, windows: &[SpeechWindow]) -> Option<String> {
    let candidates: Vec<_> = windows
        .iter()
        .filter(|window| window.visible && window.label.starts_with("poffo-bubble-"))
        .collect();
    candidates
        .iter()
        .find(|window| window.focused)
        .or_else(|| {
            candidates
                .iter()
                .find(|window| Some(window.label.as_str()) == recent)
        })
        .or_else(|| {
            candidates
                .iter()
                .min_by(|first, second| first.label.cmp(&second.label))
        })
        .map(|window| window.label.clone())
}
pub fn select(app: &AppHandle, label: &str) {
    if let Some(label) = bubble_label(label)
        && let Ok(mut recent) = app.state::<Target>().recent.lock()
    {
        *recent = Some(label);
    }
}
pub fn remove(app: &AppHandle, label: &str) {
    if let Ok(mut recent) = app.state::<Target>().recent.lock()
        && recent.as_deref() == Some(label)
    {
        *recent = None;
    }
}
fn toggle(app: &AppHandle) -> Result<(), String> {
    let recent = app
        .state::<Target>()
        .recent
        .lock()
        .map_err(|error| error.to_string())?
        .clone();
    let windows = app
        .webview_windows()
        .into_values()
        .map(|window| SpeechWindow {
            label: window.label().into(),
            visible: window.is_visible().unwrap_or(false),
            focused: window.is_focused().unwrap_or(false),
        })
        .collect::<Vec<_>>();
    if let Some(target) = select_target(recent.as_deref(), &windows) {
        app.emit_to(target, EVENT, ())
            .map_err(|error| error.to_string())?;
    }
    Ok(())
}
pub fn install(app: &AppHandle) -> Result<(), String> {
    app.plugin(
        tauri_plugin_global_shortcut::Builder::new()
            .with_handler(|app, shortcut, event| {
                if shortcut.matches(Modifiers::ALT, Code::KeyM)
                    && app.state::<Target>().trigger(event.state())
                    && let Err(error) = toggle(app)
                {
                    eprintln!("Poffo microphone shortcut failed: {error}");
                }
            })
            .build(),
    )
    .map_err(|error| error.to_string())?;
    app.global_shortcut()
        .register(Shortcut::new(Some(Modifiers::ALT), Code::KeyM))
        .map_err(|error| error.to_string())
}
