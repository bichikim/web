use serde::Serialize;
use std::{
    collections::{HashMap, HashSet},
    sync::Mutex,
};
use tauri::{AppHandle, Emitter, Manager, Webview};

#[derive(Default)]
pub(crate) struct CursorSubscribers(Mutex<HashMap<String, HashSet<String>>>);

#[derive(Clone, Serialize)]
struct CursorPosition {
    x: f64,
    y: f64,
    width: f64,
    height: f64,
}

#[tauri::command]
pub(crate) fn subscribe_poffo_cursor(
    app: AppHandle,
    caller: Webview,
    subscription: String,
    enabled: bool,
) -> Result<(), String> {
    let label = caller.label();
    if caller.window().label() != label
        || !(label == "manager"
            || label.starts_with("wallpaper-")
            || label.starts_with("poffo-widget-"))
    {
        return Err("Only local Poffo renderers can follow the pointer".to_owned());
    }
    if subscription.len() > 128 {
        return Err("Invalid cursor subscription".to_owned());
    }
    if enabled && !crate::hit_test::available(&app) {
        return Err("Native pointer monitoring is unavailable".to_owned());
    }
    let state = app.state::<CursorSubscribers>();
    let mut entries = state.0.lock().map_err(|error| error.to_string())?;
    if enabled {
        entries
            .entry(label.to_owned())
            .or_default()
            .insert(subscription);
    } else if let Some(subscribers) = entries.get_mut(label) {
        subscribers.remove(&subscription);
        if subscribers.is_empty() {
            entries.remove(label);
        }
    }
    drop(entries);
    publish_cursor(&app);
    Ok(())
}

pub(crate) fn remove(app: &AppHandle, label: &str) {
    if let Ok(mut entries) = app.state::<CursorSubscribers>().0.lock() {
        entries.remove(label);
    }
}

pub(crate) fn publish_cursor(app: &AppHandle) {
    let labels: Vec<_> = match app.state::<CursorSubscribers>().0.lock() {
        Ok(entries) => entries.keys().cloned().collect(),
        Err(_) => return,
    };
    for label in labels {
        if let Some(window) = app.get_webview_window(&label) {
            if let Ok((x, y, width, height)) = crate::hit_test::local_pointer(&window) {
                let _ = app.emit_to(
                    label,
                    "poffo-cursor",
                    CursorPosition {
                        x,
                        y,
                        width,
                        height,
                    },
                );
            }
        } else {
            remove(app, &label);
        }
    }
}
