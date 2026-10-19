#[cfg(target_os = "macos")]
mod macos;
mod mask;
#[cfg(target_os = "windows")]
mod windows;

use mask::HitMask;
use serde::Deserialize;
use std::{
    collections::HashMap,
    sync::{
        Arc, Mutex,
        atomic::{AtomicBool, Ordering},
    },
};
use tauri::{AppHandle, Manager, Webview};

#[derive(Clone, Deserialize)]
pub(crate) struct HitRegion {
    interactive: bool,
    mask: Option<HitMask>,
}
struct RegionState {
    region: Arc<HitRegion>,
    ignored: bool,
}
#[derive(Default)]
pub(crate) struct HitRegions(Mutex<HashMap<String, RegionState>>, AtomicBool);

fn require_surface(caller: &Webview) -> Result<(), String> {
    if (caller.label().starts_with("poffo-widget-") || caller.label().starts_with("poffo-bubble-"))
        && caller.window().label() == caller.label()
    {
        Ok(())
    } else {
        Err("Only local Poffo surfaces can update their own hit region".to_owned())
    }
}

#[tauri::command]
pub(crate) fn set_widget_hit_region(
    app: AppHandle,
    caller: Webview,
    region: HitRegion,
) -> Result<(), String> {
    require_surface(&caller)?;
    if !app.state::<HitRegions>().1.load(Ordering::Relaxed) {
        return Err("Native pointer monitoring is unavailable".to_owned());
    }
    if let Some(mask) = &region.mask {
        mask.validate()?;
    }
    let label = caller.label().to_owned();
    app.clone()
        .run_on_main_thread(move || {
            let state = app.state::<HitRegions>();
            if let Ok(mut entries) = state.0.lock() {
                let ignored = entries.get(&label).is_some_and(|entry| entry.ignored);
                entries.insert(
                    label,
                    RegionState {
                        region: Arc::new(region),
                        ignored,
                    },
                );
            }
            refresh(&app);
        })
        .map_err(|error| error.to_string())
}

#[tauri::command]
pub(crate) fn clear_widget_hit_region(app: AppHandle, caller: Webview) -> Result<(), String> {
    require_surface(&caller)?;
    remove(&app, caller.label());
    caller
        .window()
        .set_ignore_cursor_events(false)
        .map_err(|error| error.to_string())
}

pub(crate) fn remove(app: &AppHandle, label: &str) {
    if let Ok(mut entries) = app.state::<HitRegions>().0.lock() {
        entries.remove(label);
    }
}

pub(crate) fn refresh(app: &AppHandle) {
    crate::tracking::publish_cursor(app);
    let entries: Vec<_> = match app.state::<HitRegions>().0.lock() {
        Ok(entries) => entries
            .iter()
            .map(|(label, entry)| (label.clone(), entry.region.clone(), entry.ignored))
            .collect(),
        Err(_) => return,
    };
    for (label, region, ignored) in entries {
        let Some(window) = app.get_webview_window(&label) else {
            remove(app, &label);
            return;
        };
        let next = if region.interactive {
            false
        } else if pressed() {
            ignored
        } else {
            let Ok((x, y, width, height)) = local_pointer(&window) else {
                return;
            };
            region
                .mask
                .as_ref()
                .is_some_and(|mask| !mask.contains(x, y, width, height))
        };
        if next != ignored
            && window.set_ignore_cursor_events(next).is_ok()
            && let Ok(mut entries) = app.state::<HitRegions>().0.lock()
            && let Some(entry) = entries.get_mut(&label)
        {
            entry.ignored = next;
        }
    }
}

#[cfg(target_os = "macos")]
pub(crate) use macos::local_pointer;
#[cfg(target_os = "macos")]
use macos::{install, pressed, shutdown};
#[cfg(target_os = "windows")]
pub(crate) use windows::local_pointer;
#[cfg(target_os = "windows")]
use windows::{install, pressed, shutdown};

pub(crate) fn start(app: &AppHandle) -> Result<(), String> {
    install(app)?;
    app.state::<HitRegions>().1.store(true, Ordering::Relaxed);
    Ok(())
}
pub(crate) fn available(app: &AppHandle) -> bool {
    app.state::<HitRegions>().1.load(Ordering::Relaxed)
}
pub(crate) fn stop() {
    shutdown();
}
