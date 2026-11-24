#[cfg(target_os = "macos")]
mod macos;
mod mask;
#[cfg(target_os = "windows")]
mod windows;

pub(crate) use mask::HitBounds;
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
    #[serde(default = "ready")]
    ready: bool,
}
fn ready() -> bool {
    true
}
impl HitRegion {
    fn ignores_input(
        &self,
        pressed: bool,
        ignored: bool,
        pointer: impl FnOnce() -> Result<(f64, f64, f64, f64), String>,
    ) -> Result<bool, String> {
        if !self.ready {
            return Ok(true);
        }
        if self.interactive {
            return Ok(false);
        }
        let Some(mask) = &self.mask else {
            return Ok(true);
        };
        if mask.runs.is_empty() {
            return Ok(true);
        }
        if pressed {
            return Ok(ignored);
        }
        let (x, y, width, height) = pointer()?;
        Ok(!mask.contains(x, y, width, height))
    }
}
struct RegionState {
    region: Arc<HitRegion>,
    bounds: Option<HitBounds>,
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
            let bounds = region.mask.as_ref().and_then(HitMask::bounds);
            let mut changed = false;
            if let Ok(mut entries) = state.0.lock() {
                let ignored = entries
                    .get(&label)
                    .map_or_else(|| label.starts_with("poffo-widget-"), |entry| entry.ignored);
                changed = entries.get(&label).and_then(|entry| entry.bounds) != bounds;
                entries.insert(
                    label.clone(),
                    RegionState {
                        region: Arc::new(region),
                        bounds,
                        ignored,
                    },
                );
            }
            if changed && let Some(id) = label.strip_prefix("poffo-widget-") {
                let _ = crate::codex::bubble::emit_target(&app, id);
            }
            refresh_regions(&app, Some(&label));
        })
        .map_err(|error| error.to_string())
}

#[tauri::command]
pub(crate) fn clear_widget_hit_region(
    app: AppHandle,
    caller: Webview,
    passthrough: Option<bool>,
) -> Result<(), String> {
    require_surface(&caller)?;
    remove(&app, caller.label());
    caller
        .window()
        .set_ignore_cursor_events(
            passthrough.unwrap_or_else(|| caller.label().starts_with("poffo-widget-")),
        )
        .map_err(|error| error.to_string())
}

pub(crate) fn remove(app: &AppHandle, label: &str) {
    let removed = app
        .state::<HitRegions>()
        .0
        .lock()
        .is_ok_and(|mut entries| entries.remove(label).is_some());
    if removed && let Some(id) = label.strip_prefix("poffo-widget-") {
        let _ = crate::codex::bubble::emit_target(app, id);
    }
}

pub(crate) fn bounds(app: &AppHandle, label: &str) -> Option<HitBounds> {
    app.state::<HitRegions>().0.lock().ok()?.get(label)?.bounds
}

pub(crate) fn refresh(app: &AppHandle) {
    crate::tracking::publish_cursor(app);
    refresh_regions(app, None);
}

fn refresh_regions(app: &AppHandle, only: Option<&str>) {
    let entries: Vec<_> = match app.state::<HitRegions>().0.lock() {
        Ok(entries) => entries
            .iter()
            .filter(|(label, _)| only.is_none_or(|target| label.as_str() == target))
            .map(|(label, entry)| (label.clone(), entry.region.clone(), entry.ignored))
            .collect(),
        Err(_) => return,
    };
    for (label, region, ignored) in entries {
        let Some(window) = app.get_webview_window(&label) else {
            remove(app, &label);
            return;
        };
        let Ok(next) = region.ignores_input(pressed(), ignored, || local_pointer(&window)) else {
            return;
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

#[cfg(test)]
mod tests {
    use super::*;

    fn region(ready: bool, interactive: bool) -> HitRegion {
        HitRegion {
            ready,
            interactive,
            mask: Some(HitMask {
                width: 2,
                height: 1,
                runs: vec![[0, 0, 1]],
            }),
        }
    }

    #[test]
    fn loading_passes_input_even_during_a_held_press_or_widget_operation() {
        for interactive in [false, true] {
            for ignored in [false, true] {
                for pressed in [false, true] {
                    assert!(
                        region(false, interactive)
                            .ignores_input(pressed, ignored, || panic!(
                                "Loading must not read cursor coordinates"
                            ))
                            .unwrap()
                    );
                }
            }
        }
    }

    #[test]
    fn completed_frames_wait_for_an_alpha_mask_then_restore_hit_regions() {
        let mut region = region(true, false);
        let mask = region.mask.take();
        assert!(
            region
                .ignores_input(true, false, || panic!("No region is ready"))
                .unwrap()
        );
        region.mask = Some(HitMask {
            width: 1,
            height: 1,
            runs: vec![],
        });
        assert!(
            region
                .ignores_input(true, false, || panic!("Empty region must pass input"))
                .unwrap()
        );
        region.mask = mask;
        assert!(
            !region
                .ignores_input(false, true, || Ok((0.25, 0.5, 2., 1.)))
                .unwrap()
        );
        assert!(
            region
                .ignores_input(false, false, || Ok((1.25, 0.5, 2., 1.)))
                .unwrap()
        );
    }

    #[test]
    fn ready_operations_and_existing_drags_retain_their_input_contract() {
        assert!(
            !region(true, true)
                .ignores_input(true, true, || panic!("Full input needs no mask test"))
                .unwrap()
        );
        assert!(
            !region(true, false)
                .ignores_input(true, false, || panic!("Keep active drag"))
                .unwrap()
        );
        assert!(
            region(true, false)
                .ignores_input(true, true, || panic!("Keep underlying drag"))
                .unwrap()
        );
    }

    #[test]
    fn ordinary_speech_regions_remain_ready_and_invalid_flags_are_rejected() {
        let region: HitRegion =
            serde_json::from_str(r#"{"interactive":false,"mask":null}"#).unwrap();
        assert!(region.ready);
        assert!(
            serde_json::from_str::<HitRegion>(
                r#"{"interactive":false,"mask":null,"ready":"false"}"#
            )
            .is_err()
        );
    }
}
