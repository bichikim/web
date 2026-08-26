use std::{
    collections::HashMap,
    ptr::NonNull,
    sync::{
        Arc, Mutex, MutexGuard,
        atomic::{AtomicBool, Ordering},
        mpsc::{Sender, channel},
    },
    time::{Duration, Instant},
};

use block2::RcBlock;
use objc2::MainThreadMarker;
use objc2_app_kit::{
    NSApp, NSApplicationActivationPolicy, NSApplicationDidChangeScreenParametersNotification,
    NSScreen, NSView, NSWindow, NSWindowCollectionBehavior, NSWindowLevel, NSWorkspace,
    NSWorkspaceDidWakeNotification, NSWorkspaceScreensDidSleepNotification,
    NSWorkspaceScreensDidWakeNotification, NSWorkspaceSessionDidBecomeActiveNotification,
    NSWorkspaceSessionDidResignActiveNotification, NSWorkspaceWillSleepNotification,
};
use objc2_core_graphics::{CGWindowLevelForKey, CGWindowLevelKey};
use objc2_foundation::{NSNotification, NSNotificationCenter, NSNotificationName, NSRect};
use tauri::{
    AppHandle, LogicalSize, Manager, PhysicalPosition, PhysicalSize, Position, Runtime, Size,
    WebviewWindow,
};

use crate::{
    error::{Error, Result},
    model::BackgroundInteraction,
};

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
    backgrounds: Mutex<HashMap<String, BackgroundInteraction>>,
    operation: Mutex<()>,
    snapshots: Mutex<HashMap<String, WindowSnapshot>>,
    suspended: AtomicBool,
}

#[derive(Clone, Copy)]
enum LifecycleAction {
    Refresh,
    Resume,
    Suspend,
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

fn capture_snapshot<R: Runtime>(window: &WebviewWindow<R>) -> Result<WindowSnapshot> {
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

fn baseline<R: Runtime>(state: &SurfaceState, window: &WebviewWindow<R>) -> Result<WindowSnapshot> {
    let snapshot = capture_snapshot(window)?;
    let mut snapshots = state
        .snapshots
        .lock()
        .map_err(|error| Error::WindowOperation(error.to_string()))?;

    Ok(*snapshots
        .entry(window.label().to_owned())
        .or_insert(snapshot))
}

fn apply_snapshot<R: Runtime>(window: &WebviewWindow<R>, snapshot: WindowSnapshot) -> Result<()> {
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

fn with_native_window<R: Runtime, T>(
    window: &WebviewWindow<R>,
    operation: impl FnOnce(&NSWindow) -> T + Send + 'static,
) -> Result<T>
where
    T: Send + 'static,
{
    const INSTALLATION_TIMEOUT: Duration = Duration::from_secs(2);
    const RETRY_DELAY: Duration = Duration::from_millis(10);

    let native_view = window.ns_view()? as usize;
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
    window: &WebviewWindow<R>,
    interaction: BackgroundInteraction,
) -> Result<()> {
    let monitor = window
        .current_monitor()?
        .or(window.primary_monitor()?)
        .ok_or_else(|| Error::WindowOperation("no monitor is available".to_owned()))?;

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

fn wait_for_logical_size<R: Runtime>(
    window: &WebviewWindow<R>,
    width: f64,
    height: f64,
) -> Result<()> {
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
    window: &WebviewWindow<R>,
    interaction: BackgroundInteraction,
) -> Result<()> {
    let _operation = lock_operation(state)?;
    let snapshot = baseline(state, window)?;
    apply_snapshot(window, snapshot)?;
    apply_background(window, interaction)?;
    set_background_state(state, window.label(), Some(interaction))?;

    if state.suspended.load(Ordering::Acquire) {
        window.hide()?;
    } else {
        window.show()?;
    }

    Ok(())
}

fn refresh_backgrounds_unlocked<R: Runtime>(
    app: &AppHandle<R>,
    state: &SurfaceState,
) -> Result<()> {
    for (label, interaction) in backgrounds(state)? {
        let Some(window) = app.get_webview_window(&label) else {
            set_background_state(state, &label, None)?;
            continue;
        };

        apply_background(&window, interaction)?;
        window.show()?;
    }

    Ok(())
}

fn refresh_backgrounds<R: Runtime>(app: &AppHandle<R>, state: &SurfaceState) -> Result<()> {
    let _operation = lock_operation(state)?;
    if state.suspended.load(Ordering::Acquire) {
        return Ok(());
    }

    refresh_backgrounds_unlocked(app, state)
}

fn suspend_backgrounds<R: Runtime>(app: &AppHandle<R>, state: &SurfaceState) -> Result<()> {
    let _operation = lock_operation(state)?;
    state.suspended.store(true, Ordering::Release);

    for (label, _) in backgrounds(state)? {
        if let Some(window) = app.get_webview_window(&label) {
            window.hide()?;
        }
    }

    Ok(())
}

fn resume_backgrounds<R: Runtime>(app: &AppHandle<R>, state: &SurfaceState) -> Result<()> {
    let _operation = lock_operation(state)?;
    state.suspended.store(false, Ordering::Release);
    refresh_backgrounds_unlocked(app, state)
}

fn observe(
    center: &NSNotificationCenter,
    name: &'static NSNotificationName,
    sender: Sender<LifecycleAction>,
    action: LifecycleAction,
) {
    let handler = RcBlock::new(move |_notification: NonNull<NSNotification>| {
        if sender.send(action).is_err() {
            eprintln!("desktop surface lifecycle worker is not available");
        }
    });

    unsafe {
        center.addObserverForName_object_queue_usingBlock(Some(name), None, None, &handler);
    }
}

pub(crate) fn install_lifecycle_observers<R: Runtime>(app: AppHandle<R>) {
    let (sender, receiver) = channel();
    std::thread::spawn(move || {
        for action in receiver {
            let state = app.state::<SurfaceState>();
            let result = match action {
                LifecycleAction::Refresh => refresh_backgrounds(&app, &state),
                LifecycleAction::Resume => resume_backgrounds(&app, &state),
                LifecycleAction::Suspend => suspend_backgrounds(&app, &state),
            };

            if let Err(error) = result {
                eprintln!("desktop surface lifecycle update failed: {error}");
            }
        }
    });

    let application_center = NSNotificationCenter::defaultCenter();
    let screen_parameters_changed = unsafe { NSApplicationDidChangeScreenParametersNotification };
    observe(
        &application_center,
        screen_parameters_changed,
        sender.clone(),
        LifecycleAction::Refresh,
    );

    let workspace_center = NSWorkspace::sharedWorkspace().notificationCenter();
    let resume_notifications = unsafe {
        [
            NSWorkspaceDidWakeNotification,
            NSWorkspaceScreensDidWakeNotification,
            NSWorkspaceSessionDidBecomeActiveNotification,
        ]
    };
    for name in resume_notifications {
        observe(
            &workspace_center,
            name,
            sender.clone(),
            LifecycleAction::Resume,
        );
    }

    let suspend_notifications = unsafe {
        [
            NSWorkspaceWillSleepNotification,
            NSWorkspaceScreensDidSleepNotification,
            NSWorkspaceSessionDidResignActiveNotification,
        ]
    };
    for name in suspend_notifications {
        observe(
            &workspace_center,
            name,
            sender.clone(),
            LifecycleAction::Suspend,
        );
    }
}

pub(crate) fn set_widget<R: Runtime>(
    state: &SurfaceState,
    window: &WebviewWindow<R>,
    width: f64,
    height: f64,
) -> Result<()> {
    let _operation = lock_operation(state)?;
    set_background_state(state, window.label(), None)?;
    let snapshot = baseline(state, window)?;
    apply_snapshot(window, snapshot)?;
    window.set_decorations(false)?;
    window.set_resizable(false)?;
    window.set_always_on_top(true)?;
    window.set_size(LogicalSize::new(width, height))?;
    wait_for_logical_size(window, width, height)?;
    window.center()?;
    window.show()?;
    window.set_focus()?;
    Ok(())
}

pub(crate) fn restore<R: Runtime>(state: &SurfaceState, window: &WebviewWindow<R>) -> Result<()> {
    let _operation = lock_operation(state)?;
    set_background_state(state, window.label(), None)?;
    let snapshot = state
        .snapshots
        .lock()
        .map_err(|error| Error::WindowOperation(error.to_string()))?
        .get(window.label())
        .copied();

    if let Some(snapshot) = snapshot {
        apply_snapshot(window, snapshot)?;
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
    window: &WebviewWindow<R>,
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
