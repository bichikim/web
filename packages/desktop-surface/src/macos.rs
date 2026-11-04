mod lifecycle;
mod website;

pub(crate) use lifecycle::install_lifecycle_observers;
pub(crate) use website::{
    forward_background_mouse_event, navigate_background_surface, restore_background_content,
};

use std::{
    collections::HashMap,
    ffi::c_void,
    sync::{
        Arc, Mutex, MutexGuard,
        atomic::{AtomicBool, Ordering},
    },
    time::{Duration, Instant},
};

use objc2::MainThreadMarker;
use objc2_app_kit::{
    NSApp, NSApplicationActivationPolicy, NSColor, NSScreen, NSView, NSWindow,
    NSWindowCollectionBehavior, NSWindowLevel,
};
use objc2_core_graphics::{CGWindowLevelForKey, CGWindowLevelKey};
use objc2_foundation::NSRect;
use tauri::{
    LogicalSize, PhysicalPosition, PhysicalSize, Position, Runtime, Size, Url, Webview,
    WebviewWindow, Window,
};

use crate::{
    error::{Error, Result},
    model::BackgroundInteraction,
};
use website::{close_website_background, restore_background_content_unlocked};

#[derive(Clone, Copy, Debug)]
struct WindowSnapshot {
    activation_policy: NSApplicationActivationPolicy,
    always_on_top: bool,
    can_hide: bool,
    collection_behavior: NSWindowCollectionBehavior,
    decorations: bool,
    excluded_from_windows_menu: bool,
    frame: NSRect,
    has_shadow: bool,
    hides_on_deactivate: bool,
    ignores_mouse_events: bool,
    level: NSWindowLevel,
    movable: bool,
    movable_by_window_background: bool,
    position: PhysicalPosition<i32>,
    resizable: bool,
    size: PhysicalSize<u32>,
}

#[derive(Default)]
pub(crate) struct SurfaceState {
    background_urls: Mutex<HashMap<String, Url>>,
    backgrounds: Mutex<HashMap<String, BackgroundInteraction>>,
    operation: Mutex<()>,
    snapshots: Mutex<HashMap<String, WindowSnapshot>>,
    suspended: AtomicBool,
}

fn background_window_level() -> NSWindowLevel {
    let desktop = CGWindowLevelForKey(CGWindowLevelKey::DesktopWindowLevelKey) as NSWindowLevel;
    let desktop_icons =
        CGWindowLevelForKey(CGWindowLevelKey::DesktopIconWindowLevelKey) as NSWindowLevel;

    desktop
        .saturating_add(1)
        .min(desktop_icons.saturating_sub(1))
}

fn interactive_background_window_level() -> NSWindowLevel {
    (CGWindowLevelForKey(CGWindowLevelKey::DesktopIconWindowLevelKey) as NSWindowLevel)
        .saturating_add(1)
}

fn capture_snapshot<R: Runtime>(window: &Window<R>) -> Result<WindowSnapshot> {
    let native_snapshot = with_native_window(window, |window| WindowSnapshot {
        activation_policy: NSApp(unsafe { MainThreadMarker::new_unchecked() }).activationPolicy(),
        always_on_top: false,
        can_hide: window.canHide(),
        collection_behavior: window.collectionBehavior(),
        decorations: false,
        excluded_from_windows_menu: window.isExcludedFromWindowsMenu(),
        frame: window.frame(),
        has_shadow: window.hasShadow(),
        hides_on_deactivate: window.hidesOnDeactivate(),
        ignores_mouse_events: window.ignoresMouseEvents(),
        level: window.level(),
        movable: window.isMovable(),
        movable_by_window_background: window.isMovableByWindowBackground(),
        position: PhysicalPosition::new(0, 0),
        resizable: false,
        size: PhysicalSize::new(0, 0),
    })?;

    Ok(WindowSnapshot {
        always_on_top: window.is_always_on_top()?,
        decorations: window.is_decorated()?,
        position: window.outer_position()?,
        resizable: window.is_resizable()?,
        size: window.inner_size()?,
        ..native_snapshot
    })
}

fn baseline<R: Runtime>(state: &SurfaceState, window: &Window<R>) -> Result<WindowSnapshot> {
    let snapshot = capture_snapshot(window)?;
    let mut snapshots = state
        .snapshots
        .lock()
        .map_err(|error| Error::WindowOperation(error.to_string()))?;

    Ok(*snapshots
        .entry(window.label().to_owned())
        .or_insert(snapshot))
}

fn apply_snapshot<R: Runtime>(window: &Window<R>, snapshot: WindowSnapshot) -> Result<()> {
    window.set_always_on_top(snapshot.always_on_top)?;
    window.set_decorations(snapshot.decorations)?;
    window.set_resizable(snapshot.resizable)?;
    window.set_position(Position::Physical(snapshot.position))?;
    window.set_size(Size::Physical(snapshot.size))?;

    let activation_policy_restored = with_native_window(window, move |window| {
        window.setCollectionBehavior(snapshot.collection_behavior);
        window.setCanHide(snapshot.can_hide);
        window.setExcludedFromWindowsMenu(snapshot.excluded_from_windows_menu);
        window.setHasShadow(snapshot.has_shadow);
        window.setHidesOnDeactivate(snapshot.hides_on_deactivate);
        window.setIgnoresMouseEvents(snapshot.ignores_mouse_events);
        window.setLevel(snapshot.level);
        window.setMovable(snapshot.movable);
        window.setMovableByWindowBackground(snapshot.movable_by_window_background);
        window.setFrame_display(snapshot.frame, false);
        let application = NSApp(unsafe { MainThreadMarker::new_unchecked() });
        application.activationPolicy() == snapshot.activation_policy
            || application.setActivationPolicy(snapshot.activation_policy)
    })?;

    if !activation_policy_restored {
        return Err(Error::WindowOperation(
            "failed to restore the application activation policy".to_owned(),
        ));
    }

    Ok(())
}

fn backgrounds(state: &SurfaceState) -> Result<Vec<(String, BackgroundInteraction)>> {
    state
        .backgrounds
        .lock()
        .map(|backgrounds| {
            backgrounds
                .iter()
                .map(|(label, interaction)| (label.clone(), *interaction))
                .collect()
        })
        .map_err(|error| Error::WindowOperation(error.to_string()))
}

fn lock_operation(state: &SurfaceState) -> Result<MutexGuard<'_, ()>> {
    state
        .operation
        .lock()
        .map_err(|error| Error::WindowOperation(error.to_string()))
}

fn set_background_state(
    state: &SurfaceState,
    label: &str,
    interaction: Option<BackgroundInteraction>,
) -> Result<()> {
    let mut backgrounds = state
        .backgrounds
        .lock()
        .map_err(|error| Error::WindowOperation(error.to_string()))?;

    match interaction {
        Some(interaction) => {
            backgrounds.insert(label.to_owned(), interaction);
        }
        None => {
            backgrounds.remove(label);
        }
    }

    Ok(())
}

fn active_background_interaction(
    state: &SurfaceState,
    label: &str,
) -> Result<BackgroundInteraction> {
    state
        .backgrounds
        .lock()
        .map_err(|error| Error::WindowOperation(error.to_string()))?
        .get(label)
        .copied()
        .ok_or_else(|| Error::NotBackgroundSurface(label.to_owned()))
}

pub(crate) fn get_background_interaction(
    state: &SurfaceState,
    label: &str,
) -> Result<BackgroundInteraction> {
    active_background_interaction(state, label)
}

pub(crate) fn set_control_surface_corner_radius<W: NativeWindowHandle>(
    window: &W,
    radius: f64,
) -> Result<()> {
    with_native_window(window, move |window| -> Result<()> {
        window.setOpaque(false);
        let clear = NSColor::clearColor();
        window.setBackgroundColor(Some(&clear));

        let content_view = window.contentView().ok_or_else(|| {
            Error::WindowOperation("native window has no content view".to_owned())
        })?;
        content_view.setWantsLayer(true);
        let layer = content_view.layer().ok_or_else(|| {
            Error::WindowOperation("native window content view has no layer".to_owned())
        })?;
        layer.setCornerRadius(radius);
        layer.setMasksToBounds(true);

        Ok(())
    })??;

    Ok(())
}

fn reset_surface_corner_radius<W: NativeWindowHandle>(window: &W) -> Result<()> {
    with_native_window(window, |window| -> Result<()> {
        window.setOpaque(true);
        let background = NSColor::windowBackgroundColor();
        window.setBackgroundColor(Some(&background));

        let content_view = window.contentView().ok_or_else(|| {
            Error::WindowOperation("native window has no content view".to_owned())
        })?;
        content_view.setWantsLayer(true);
        let layer = content_view.layer().ok_or_else(|| {
            Error::WindowOperation("native window content view has no layer".to_owned())
        })?;
        layer.setCornerRadius(0.0);
        layer.setMasksToBounds(false);

        Ok(())
    })??;

    Ok(())
}

pub(crate) fn set_control_surface_shadow<W: NativeWindowHandle>(window: &W) -> Result<()> {
    with_native_window(window, |window| {
        window.setHasShadow(true);
        window.invalidateShadow();
    })?;

    Ok(())
}

pub(crate) trait NativeWindowHandle {
    fn native_view(&self) -> tauri::Result<*mut c_void>;
    fn run_on_main_thread<F: FnOnce() + Send + 'static>(&self, operation: F) -> tauri::Result<()>;
}

impl<R: Runtime> NativeWindowHandle for Window<R> {
    fn native_view(&self) -> tauri::Result<*mut c_void> {
        self.ns_view()
    }

    fn run_on_main_thread<F: FnOnce() + Send + 'static>(&self, operation: F) -> tauri::Result<()> {
        self.run_on_main_thread(operation)
    }
}

impl<R: Runtime> NativeWindowHandle for WebviewWindow<R> {
    fn native_view(&self) -> tauri::Result<*mut c_void> {
        self.ns_view()
    }

    fn run_on_main_thread<F: FnOnce() + Send + 'static>(&self, operation: F) -> tauri::Result<()> {
        self.run_on_main_thread(operation)
    }
}

fn with_native_window<W: NativeWindowHandle, T>(
    window: &W,
    operation: impl FnOnce(&NSWindow) -> T + Send + 'static,
) -> Result<T>
where
    T: Send + 'static,
{
    const INSTALLATION_TIMEOUT: Duration = Duration::from_secs(2);
    const RETRY_DELAY: Duration = Duration::from_millis(10);

    let native_view = window.native_view()? as usize;
    let operation = Arc::new(Mutex::new(Some(operation)));
    let deadline = Instant::now() + INSTALLATION_TIMEOUT;

    loop {
        let (sender, receiver) = std::sync::mpsc::sync_channel(1);
        let operation = Arc::clone(&operation);

        window.run_on_main_thread(move || {
            let view = unsafe { &*(native_view as *const NSView) };
            let result = view.window().map(|window| {
                operation
                    .lock()
                    .map_err(|error| Error::WindowOperation(error.to_string()))?
                    .take()
                    .map(|operation| operation(&window))
                    .ok_or_else(|| {
                        Error::WindowOperation(
                            "native window operation was already consumed".to_owned(),
                        )
                    })
            });
            let _ = sender.send(result.transpose());
        })?;

        match receiver
            .recv()
            .map_err(|error| Error::WindowOperation(error.to_string()))??
        {
            Some(result) => return Ok(result),
            None if Instant::now() < deadline => std::thread::sleep(RETRY_DELAY),
            None => {
                return Err(Error::WindowOperation(
                    "webview was not installed in its native window within 2 seconds".to_owned(),
                ));
            }
        }
    }
}

fn apply_background<R: Runtime>(
    window: &Window<R>,
    interaction: BackgroundInteraction,
) -> Result<()> {
    let monitor = window
        .current_monitor()?
        .or(window.primary_monitor()?)
        .ok_or_else(|| Error::WindowOperation("no monitor is available".to_owned()))?;

    reset_surface_corner_radius(window)?;
    window.set_decorations(false)?;
    window.set_resizable(false)?;
    window.set_always_on_top(false)?;
    window.set_position(Position::Physical(*monitor.position()))?;
    window.set_size(Size::Physical(*monitor.size()))?;

    let activation_policy_changed = with_native_window(window, move |window| -> Result<bool> {
        let screen = window
            .screen()
            .or_else(|| NSScreen::mainScreen(unsafe { MainThreadMarker::new_unchecked() }))
            .ok_or_else(|| Error::WindowOperation("no native screen is available".to_owned()))?;
        window.setFrame_display(screen.frame(), true);

        let behavior = window
            .collectionBehavior()
            .difference(NSWindowCollectionBehavior::Managed)
            .difference(NSWindowCollectionBehavior::ParticipatesInCycle)
            .difference(NSWindowCollectionBehavior::FullScreenAuxiliary)
            .difference(NSWindowCollectionBehavior::FullScreenPrimary)
            .union(NSWindowCollectionBehavior::CanJoinAllSpaces)
            .union(NSWindowCollectionBehavior::Stationary)
            .union(NSWindowCollectionBehavior::IgnoresCycle)
            .union(NSWindowCollectionBehavior::FullScreenNone);

        window.setCollectionBehavior(behavior);
        window.setCanHide(false);
        window.setExcludedFromWindowsMenu(true);
        window.setHasShadow(false);
        window.setHidesOnDeactivate(false);
        window.setMovable(false);
        window.setMovableByWindowBackground(false);
        match interaction {
            BackgroundInteraction::Interactive => {
                window.setIgnoresMouseEvents(false);
                window.setLevel(interactive_background_window_level());
                window.makeKeyAndOrderFront(None);
            }
            BackgroundInteraction::PassThrough => {
                window.setIgnoresMouseEvents(true);
                window.setLevel(background_window_level());
                window.orderBack(None);
            }
        }
        let application = NSApp(unsafe { MainThreadMarker::new_unchecked() });
        Ok(
            application.activationPolicy() == NSApplicationActivationPolicy::Accessory
                || application.setActivationPolicy(NSApplicationActivationPolicy::Accessory),
        )
    })??;

    if !activation_policy_changed {
        return Err(Error::WindowOperation(
            "failed to enter the background application activation policy".to_owned(),
        ));
    }

    Ok(())
}

fn show_background_surface<R: Runtime>(
    window: &Window<R>,
    interaction: BackgroundInteraction,
) -> Result<()> {
    window.show()?;

    if interaction == BackgroundInteraction::PassThrough {
        apply_background(window, interaction)?;
    }

    Ok(())
}

fn wait_for_logical_size<R: Runtime>(window: &Window<R>, width: f64, height: f64) -> Result<()> {
    const SIZE_TOLERANCE: f64 = 1.0;
    const TIMEOUT: Duration = Duration::from_secs(2);
    const RETRY_DELAY: Duration = Duration::from_millis(10);

    let deadline = Instant::now() + TIMEOUT;
    loop {
        let size = window.inner_size()?;
        let scale = window.scale_factor()?;
        let logical_width = f64::from(size.width) / scale;
        let logical_height = f64::from(size.height) / scale;

        if (logical_width - width).abs() <= SIZE_TOLERANCE
            && (logical_height - height).abs() <= SIZE_TOLERANCE
        {
            return Ok(());
        }

        if Instant::now() >= deadline {
            return Err(Error::WindowOperation(format!(
                "surface size did not reach {width}x{height}; last observed size was {logical_width}x{logical_height}"
            )));
        }

        std::thread::sleep(RETRY_DELAY);
    }
}

pub(crate) fn set_background<R: Runtime>(
    state: &SurfaceState,
    window: &Window<R>,
    interaction: BackgroundInteraction,
) -> Result<()> {
    let _operation = lock_operation(state)?;
    close_website_background(window)?;
    let snapshot = baseline(state, window)?;
    apply_snapshot(window, snapshot)?;
    apply_background(window, interaction)?;
    set_background_state(state, window.label(), Some(interaction))?;

    if state.suspended.load(Ordering::Acquire) {
        window.hide()?;
    } else {
        show_background_surface(window, interaction)?;
    }

    Ok(())
}

pub(crate) fn set_widget<R: Runtime>(
    state: &SurfaceState,
    window: &Window<R>,
    width: f64,
    height: f64,
    corner_radius: Option<f64>,
) -> Result<()> {
    let _operation = lock_operation(state)?;
    close_website_background(window)?;
    set_background_state(state, window.label(), None)?;
    let snapshot = baseline(state, window)?;
    apply_snapshot(window, snapshot)?;
    window.set_decorations(false)?;
    window.set_resizable(false)?;
    window.set_always_on_top(true)?;
    window.set_size(LogicalSize::new(width, height))?;
    wait_for_logical_size(window, width, height)?;
    if let Some(corner_radius) = corner_radius {
        set_control_surface_corner_radius(window, corner_radius)?;
    } else {
        reset_surface_corner_radius(window)?;
    }
    set_control_surface_shadow(window)?;
    window.center()?;
    window.show()?;
    window.set_focus()?;
    Ok(())
}

pub(crate) fn restore<R: Runtime>(
    state: &SurfaceState,
    window: &Window<R>,
    main_webview: &Webview<R>,
) -> Result<()> {
    let _operation = lock_operation(state)?;
    restore_background_content_unlocked(state, window, main_webview)?;
    set_background_state(state, window.label(), None)?;
    let snapshot = state
        .snapshots
        .lock()
        .map_err(|error| Error::WindowOperation(error.to_string()))?
        .get(window.label())
        .copied();

    if let Some(snapshot) = snapshot {
        apply_snapshot(window, snapshot)?;
        reset_surface_corner_radius(window)?;
        window.show()?;
        window.set_focus()?;
        state
            .snapshots
            .lock()
            .map_err(|error| Error::WindowOperation(error.to_string()))?
            .remove(window.label());
    }

    Ok(())
}

pub(crate) fn set_background_interaction<R: Runtime>(
    state: &SurfaceState,
    window: &Window<R>,
    interaction: BackgroundInteraction,
) -> Result<()> {
    let _operation = lock_operation(state)?;
    active_background_interaction(state, window.label())?;
    apply_background(window, interaction)?;
    set_background_state(state, window.label(), Some(interaction))?;

    if !state.suspended.load(Ordering::Acquire) {
        window.show()?;
    }

    Ok(())
}
