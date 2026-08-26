use std::sync::{Mutex, mpsc::sync_channel};

use objc2::MainThreadMarker;
use objc2_app_kit::{
    NSApp, NSApplicationActivationPolicy, NSApplicationDidChangeScreenParametersNotification,
    NSView, NSWindowCollectionBehavior, NSWindowLevel, NSWorkspace,
    NSWorkspaceScreensDidSleepNotification, NSWorkspaceScreensDidWakeNotification,
};
use objc2_core_graphics::{CGWindowLevelForKey, CGWindowLevelKey};
use objc2_foundation::NSNotificationCenter;
use serde::Serialize;
use tauri::{AppHandle, Manager, PhysicalSize, Runtime, Size, WebviewWindow};

#[derive(Clone, Copy, Debug, PartialEq)]
struct WindowProbe {
    activation_policy: NSApplicationActivationPolicy,
    can_hide: bool,
    collection_behavior: usize,
    excluded_from_windows_menu: bool,
    frame_height: f64,
    frame_width: f64,
    frame_x: f64,
    frame_y: f64,
    has_shadow: bool,
    hides_on_deactivate: bool,
    ignores_mouse_events: bool,
    is_opaque: bool,
    level: NSWindowLevel,
    movable: bool,
    movable_by_window_background: bool,
    screen_frame_height: Option<f64>,
    screen_frame_width: Option<f64>,
    screen_frame_x: Option<f64>,
    screen_frame_y: Option<f64>,
}

#[derive(Default)]
struct ProbeState(Mutex<Option<WindowProbe>>);

#[derive(Clone, Copy, Serialize)]
#[serde(rename_all = "camelCase")]
struct HarnessMode {
    smoke: bool,
}

fn probe_window<R: Runtime>(window: &WebviewWindow<R>) -> Result<WindowProbe, String> {
    let (sender, receiver) = sync_channel(1);
    let native_view = window.ns_view().map_err(|error| error.to_string())? as usize;

    window
        .run_on_main_thread(move || {
            let view = unsafe { &*(native_view as *const NSView) };
            let probe = view
                .window()
                .ok_or_else(|| "webview is not installed in its window yet".to_owned())
                .map(|window| WindowProbe {
                    activation_policy: NSApp(unsafe { MainThreadMarker::new_unchecked() })
                        .activationPolicy(),
                    can_hide: window.canHide(),
                    collection_behavior: window.collectionBehavior().bits(),
                    excluded_from_windows_menu: window.isExcludedFromWindowsMenu(),
                    frame_height: window.frame().size.height,
                    frame_width: window.frame().size.width,
                    frame_x: window.frame().origin.x,
                    frame_y: window.frame().origin.y,
                    has_shadow: window.hasShadow(),
                    hides_on_deactivate: window.hidesOnDeactivate(),
                    ignores_mouse_events: window.ignoresMouseEvents(),
                    is_opaque: window.isOpaque(),
                    level: window.level(),
                    movable: window.isMovable(),
                    movable_by_window_background: window.isMovableByWindowBackground(),
                    screen_frame_height: window.screen().map(|screen| screen.frame().size.height),
                    screen_frame_width: window.screen().map(|screen| screen.frame().size.width),
                    screen_frame_x: window.screen().map(|screen| screen.frame().origin.x),
                    screen_frame_y: window.screen().map(|screen| screen.frame().origin.y),
                });
            let _ = sender.send(probe);
        })
        .map_err(|error| error.to_string())?;

    receiver.recv().map_err(|error| error.to_string())?
}

fn background_window<R: Runtime>(app: &AppHandle<R>) -> Result<WebviewWindow<R>, String> {
    app.get_webview_window("background")
        .ok_or_else(|| "background window was not found".to_owned())
}

#[tauri::command]
fn harness_mode(smoke: tauri::State<'_, HarnessMode>) -> HarnessMode {
    *smoke
}

#[tauri::command]
fn capture_baseline<R: Runtime>(
    app: AppHandle<R>,
    state: tauri::State<'_, ProbeState>,
) -> Result<(), String> {
    let probe = probe_window(&background_window(&app)?)?;
    let mut baseline = state.0.lock().map_err(|error| error.to_string())?;
    if baseline.is_none() {
        *baseline = Some(probe);
    }
    Ok(())
}

#[tauri::command]
fn assert_background<R: Runtime>(app: AppHandle<R>) -> Result<(), String> {
    let window = background_window(&app)?;
    let probe = probe_window(&window)?;
    let required_behavior = NSWindowCollectionBehavior::CanJoinAllSpaces
        .union(NSWindowCollectionBehavior::Stationary)
        .union(NSWindowCollectionBehavior::IgnoresCycle)
        .union(NSWindowCollectionBehavior::FullScreenNone);
    let desktop_level =
        CGWindowLevelForKey(CGWindowLevelKey::DesktopWindowLevelKey) as NSWindowLevel;
    let desktop_icon_level =
        CGWindowLevelForKey(CGWindowLevelKey::DesktopIconWindowLevelKey) as NSWindowLevel;
    let background_level = desktop_level
        .saturating_add(1)
        .min(desktop_icon_level.saturating_sub(1));

    if probe.level != background_level {
        return Err(format!(
            "background level mismatch: expected {background_level}, got {}",
            probe.level
        ));
    }
    if !probe.ignores_mouse_events || probe.has_shadow {
        return Err("background input or shadow state is incorrect".to_owned());
    }
    if probe.activation_policy != NSApplicationActivationPolicy::Accessory
        || probe.can_hide
        || !probe.excluded_from_windows_menu
        || probe.hides_on_deactivate
        || probe.movable
        || probe.movable_by_window_background
    {
        return Err("background application or window participation is incorrect".to_owned());
    }
    if probe.collection_behavior & required_behavior.bits() != required_behavior.bits() {
        return Err("background collection behavior is incomplete".to_owned());
    }
    if probe.collection_behavior & NSWindowCollectionBehavior::FullScreenAuxiliary.bits() != 0 {
        return Err("background incorrectly participates in fullscreen spaces".to_owned());
    }

    let frame = (
        probe.frame_x,
        probe.frame_y,
        probe.frame_width,
        probe.frame_height,
    );
    let screen_frame = (
        probe.screen_frame_x,
        probe.screen_frame_y,
        probe.screen_frame_width,
        probe.screen_frame_height,
    );
    if screen_frame != (Some(frame.0), Some(frame.1), Some(frame.2), Some(frame.3)) {
        return Err(format!(
            "background frame does not match the full screen frame: {frame:?} versus {screen_frame:?}"
        ));
    }

    Ok(())
}

#[tauri::command]
fn assert_background_interactive<R: Runtime>(app: AppHandle<R>) -> Result<(), String> {
    let probe = probe_window(&background_window(&app)?)?;
    let expected_level = (CGWindowLevelForKey(CGWindowLevelKey::DesktopIconWindowLevelKey)
        as NSWindowLevel)
        .saturating_add(1);

    if probe.ignores_mouse_events || probe.level != expected_level {
        return Err(format!(
            "interactive background mismatch: expected input with level {expected_level}, got ignore={} level={}",
            probe.ignores_mouse_events, probe.level
        ));
    }

    Ok(())
}

#[tauri::command]
fn disturb_background<R: Runtime>(app: AppHandle<R>) -> Result<(), String> {
    let window = background_window(&app)?;
    window
        .set_size(Size::Physical(PhysicalSize::new(320, 240)))
        .map_err(|error| error.to_string())?;
    let (sender, receiver) = sync_channel(1);
    let native_view = window.ns_view().map_err(|error| error.to_string())? as usize;

    window
        .run_on_main_thread(move || {
            let view = unsafe { &*(native_view as *const NSView) };
            let result = view
                .window()
                .ok_or_else(|| "webview is not installed in its window yet".to_owned())
                .map(|window| {
                    window.setIgnoresMouseEvents(false);
                    window.setLevel(0);
                });
            let _ = sender.send(result);
        })
        .map_err(|error| error.to_string())?;
    receiver.recv().map_err(|error| error.to_string())??;

    let center = NSNotificationCenter::defaultCenter();
    unsafe {
        center
            .postNotificationName_object(NSApplicationDidChangeScreenParametersNotification, None);
    }

    Ok(())
}

#[tauri::command]
fn simulate_screen_sleep() {
    let center = NSWorkspace::sharedWorkspace().notificationCenter();
    unsafe {
        center.postNotificationName_object(NSWorkspaceScreensDidSleepNotification, None);
    }
}

#[tauri::command]
fn simulate_screen_wake() {
    let center = NSWorkspace::sharedWorkspace().notificationCenter();
    unsafe {
        center.postNotificationName_object(NSWorkspaceScreensDidWakeNotification, None);
    }
}

#[tauri::command]
fn assert_background_hidden<R: Runtime>(app: AppHandle<R>) -> Result<(), String> {
    if background_window(&app)?
        .is_visible()
        .map_err(|error| error.to_string())?
    {
        return Err("background remained visible while the screen was asleep".to_owned());
    }

    Ok(())
}

#[tauri::command]
fn assert_control<R: Runtime>(app: AppHandle<R>) -> Result<(), String> {
    let window = app
        .get_webview_window("controls")
        .ok_or_else(|| "control window was not found".to_owned())?;
    let probe = probe_window(&window)?;

    if probe.is_opaque || probe.ignores_mouse_events || probe.has_shadow {
        return Err("control transparency or input state is incorrect".to_owned());
    }

    Ok(())
}

#[tauri::command]
fn assert_widget<R: Runtime>(app: AppHandle<R>) -> Result<(), String> {
    let window = background_window(&app)?;
    let size = window.inner_size().map_err(|error| error.to_string())?;
    let scale = window.scale_factor().map_err(|error| error.to_string())?;
    let logical_width = f64::from(size.width) / scale;
    let logical_height = f64::from(size.height) / scale;

    if (logical_width - 420.0).abs() > 1.0 || (logical_height - 520.0).abs() > 1.0 {
        return Err(format!(
            "widget size mismatch: expected 420x520, got {logical_width}x{logical_height}"
        ));
    }
    if !window
        .is_always_on_top()
        .map_err(|error| error.to_string())?
        || window.is_decorated().map_err(|error| error.to_string())?
        || window.is_resizable().map_err(|error| error.to_string())?
    {
        return Err("widget level, decoration, or resize state is incorrect".to_owned());
    }

    Ok(())
}

#[tauri::command]
fn assert_restored<R: Runtime>(
    app: AppHandle<R>,
    state: tauri::State<'_, ProbeState>,
) -> Result<(), String> {
    let baseline = state
        .0
        .lock()
        .map_err(|error| error.to_string())?
        .ok_or_else(|| "baseline was not captured".to_owned())?;
    let restored = probe_window(&background_window(&app)?)?;

    if restored != baseline {
        return Err(format!(
            "background was not restored: expected {baseline:?}, got {restored:?}"
        ));
    }

    Ok(())
}

#[tauri::command]
fn finish_smoke(app: AppHandle, error: Option<String>) {
    if let Some(error) = error {
        eprintln!("DESKTOP_SURFACE_RUNTIME_FAILED: {error}");
        app.exit(1);
    } else {
        println!("DESKTOP_SURFACE_RUNTIME_OK");
        app.exit(0);
    }
}

fn main() {
    let smoke = std::env::args().any(|argument| argument == "--smoke");

    tauri::Builder::default()
        .manage(HarnessMode { smoke })
        .manage(ProbeState::default())
        .plugin(tauri_plugin_desktop_surface::init())
        .invoke_handler(tauri::generate_handler![
            assert_background,
            assert_background_hidden,
            assert_background_interactive,
            assert_control,
            assert_restored,
            assert_widget,
            capture_baseline,
            disturb_background,
            finish_smoke,
            harness_mode,
            simulate_screen_sleep,
            simulate_screen_wake,
        ])
        .run(tauri::generate_context!())
        .expect("desktop surface harness failed");
}
