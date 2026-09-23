use std::{
    collections::HashMap,
    ffi::c_void,
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
    NSColor, NSScreen, NSView, NSWindow, NSWindowCollectionBehavior, NSWindowLevel,
    NSWindowOrderingMode, NSWorkspace, NSWorkspaceDidWakeNotification,
    NSWorkspaceScreensDidSleepNotification, NSWorkspaceScreensDidWakeNotification,
    NSWorkspaceSessionDidBecomeActiveNotification, NSWorkspaceSessionDidResignActiveNotification,
    NSWorkspaceWillSleepNotification,
};
use objc2_core_graphics::{CGWindowLevelForKey, CGWindowLevelKey};
use objc2_foundation::{NSNotification, NSNotificationCenter, NSNotificationName, NSRect};
use tauri::{
    AppHandle, LogicalPosition, LogicalSize, Manager, PhysicalPosition, PhysicalSize, Position,
    Runtime, Size, Url, Webview, WebviewBuilder, WebviewUrl, WebviewWindow, Window,
};

use crate::{
    error::{Error, Result},
    model::{BackgroundInteraction, BackgroundMouseEventKind, ValidatedBackgroundMouseEvent},
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
    background_urls: Mutex<HashMap<String, Url>>,
    backgrounds: Mutex<HashMap<String, BackgroundInteraction>>,
    operation: Mutex<()>,
    snapshots: Mutex<HashMap<String, WindowSnapshot>>,
    suspended: AtomicBool,
}

const WEBSITE_BACKGROUND_WEBVIEW_SUFFIX: &str = "__website_background";

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

pub(crate) fn set_control_surface_corner_radius<R: Runtime>(
    window: &WebviewWindow<R>,
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

pub(crate) fn set_control_surface_shadow<R: Runtime>(window: &WebviewWindow<R>) -> Result<()> {
    with_native_window(window, |window| {
        window.setHasShadow(true);
        window.invalidateShadow();
    })?;

    Ok(())
}

fn website_background_webview_label(window_label: &str) -> String {
    format!("{window_label}{WEBSITE_BACKGROUND_WEBVIEW_SUFFIX}")
}

fn set_surface_transparent<W: NativeWindowHandle>(window: &W) -> Result<()> {
    with_native_window(window, |window| {
        window.setOpaque(false);
        let clear = NSColor::clearColor();
        window.setBackgroundColor(Some(&clear));
    })?;

    Ok(())
}

fn close_website_background<R: Runtime>(main_webview: &Webview<R>) -> Result<()> {
    let label = website_background_webview_label(main_webview.label());
    let parent = main_webview.window();

    if let Some(webview) = parent
        .webviews()
        .into_iter()
        .find(|webview| webview.label() == label)
    {
        webview.close()?;
    }

    Ok(())
}

fn place_website_background_below<R: Runtime>(
    window: &WebviewWindow<R>,
    child: &Webview<R>,
) -> Result<()> {
    let main_webview = window.as_ref().clone();
    let child = child.clone();

    main_webview.with_webview(move |main_platform_webview| {
        let main_view = main_platform_webview.inner() as usize;
        if let Err(error) = child.with_webview(move |child_platform_webview| {
            // The child is created after the app webview, so explicitly move it below the
            // existing app view instead of relying on AppKit's insertion order.
            let main_view = unsafe { &*(main_view as *const NSView) };
            let child_view = unsafe { &*(child_platform_webview.inner() as *const NSView) };
            let Some(parent_view) =
                (unsafe { child_view.superview() }).or_else(|| unsafe { main_view.superview() })
            else {
                return;
            };

            parent_view.addSubview_positioned_relativeTo(
                child_view,
                NSWindowOrderingMode::Below,
                Some(main_view),
            );
        }) {
            eprintln!("failed to place website background below the app view: {error}");
        }
    })?;

    Ok(())
}

fn website_mouse_event_script(event: &ValidatedBackgroundMouseEvent) -> String {
    let kind = match event.kind {
        BackgroundMouseEventKind::Down => "down",
        BackgroundMouseEventKind::Up => "up",
        BackgroundMouseEventKind::Dragged => "dragged",
    };

    format!(
        r#"
(() => {{
  const x = {x};
  const y = {y};
  const button = {button};
  const buttons = {buttons};
  const clickCount = {click_count};
  const modifiers = {{
    altKey: {alt_key},
    ctrlKey: {ctrl_key},
    metaKey: {meta_key},
    shiftKey: {shift_key},
  }};
  const stateKey = '__pomoDesktopMouseState';
  const state = window[stateKey] || (window[stateKey] = {{}});
  const hit = document.elementFromPoint(x, y);
  const common = {{
    bubbles: true,
    cancelable: true,
    clientX: x,
    clientY: y,
    composed: true,
    detail: clickCount,
    view: window,
    ...modifiers,
  }};

  const dispatchMouse = (type, target, overrides = {{}}) =>
    target.dispatchEvent(new MouseEvent(type, {{...common, ...overrides}}));
  const dispatchPointer = (type, target, overrides = {{}}) => {{
    if (typeof PointerEvent !== 'function') return;
    target.dispatchEvent(
      new PointerEvent(type, {{
        ...common,
        ...overrides,
        isPrimary: true,
        pointerId: 1,
        pointerType: 'mouse',
      }}),
    );
  }};

  if ('{kind}' === 'down') {{
    if (!hit) return;
    state.target = hit;
    state.x = x;
    state.y = y;
    state.dragged = false;
    state.button = button;
    dispatchPointer('pointerdown', hit, {{button, buttons}});
    dispatchMouse('mousedown', hit, {{button, buttons}});
    if (hit instanceof HTMLElement) hit.focus({{preventScroll: true}});
    return;
  }}

  const target = hit || state.target;
  if (!target) return;

  if ('{kind}' === 'dragged') {{
    if (state.target && Math.hypot(x - state.x, y - state.y) > 4) state.dragged = true;
    dispatchPointer('pointermove', target, {{button, buttons}});
    dispatchMouse('mousemove', target, {{button, buttons}});
    return;
  }}

  const clickTarget = state.target || target;
  dispatchPointer('pointerup', target, {{button, buttons: 0}});
  dispatchMouse('mouseup', target, {{button, buttons: 0}});
  if (!state.dragged && button === 0) {{
    dispatchMouse('click', clickTarget, {{button: 0, buttons: 0}});
  }} else if (button === 1) {{
    dispatchMouse('auxclick', clickTarget, {{button: 1, buttons: 0}});
  }} else if (button === 2) {{
    dispatchMouse('contextmenu', clickTarget, {{button: 2, buttons: 0}});
  }}
  delete window[stateKey];
}})()
"#,
        alt_key = event.alt_key,
        button = event.button,
        buttons = event.buttons,
        click_count = event.click_count,
        ctrl_key = event.ctrl_key,
        kind = kind,
        meta_key = event.meta_key,
        shift_key = event.shift_key,
        x = event.x,
        y = event.y,
    )
}

pub(crate) fn forward_background_mouse_event<R: Runtime>(
    state: &SurfaceState,
    main_webview: &Webview<R>,
    event: ValidatedBackgroundMouseEvent,
) -> Result<()> {
    let _operation = lock_operation(state)?;
    let parent = main_webview.window();
    let label = website_background_webview_label(main_webview.label());
    let Some(child) = parent
        .webviews()
        .into_iter()
        .find(|webview| webview.label() == label)
    else {
        return Ok(());
    };

    child.eval(website_mouse_event_script(&event))?;

    Ok(())
}

trait NativeWindowHandle {
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
    window: &WebviewWindow<R>,
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
    window: &WebviewWindow<R>,
    interaction: BackgroundInteraction,
) -> Result<()> {
    window.show()?;

    if interaction == BackgroundInteraction::PassThrough {
        apply_background(window, interaction)?;
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

fn restore_background_content_unlocked<R: Runtime>(
    state: &SurfaceState,
    window: &WebviewWindow<R>,
) -> Result<()> {
    close_website_background(window.as_ref())?;
    reset_surface_corner_radius(window)?;

    let original_url = state
        .background_urls
        .lock()
        .map_err(|error| Error::WindowOperation(error.to_string()))?
        .get(window.label())
        .cloned();

    if let Some(original_url) = original_url {
        window.navigate(original_url)?;
        state
            .background_urls
            .lock()
            .map_err(|error| Error::WindowOperation(error.to_string()))?
            .remove(window.label());
    }

    Ok(())
}

fn navigate_background_unlocked<R: Runtime>(
    state: &SurfaceState,
    window: &WebviewWindow<R>,
    url: Url,
) -> Result<()> {
    close_website_background(window.as_ref())?;
    let label = window.label().to_owned();
    active_background_interaction(state, &label)?;
    let original_url = window.url()?;
    let inserted = {
        let mut background_urls = state
            .background_urls
            .lock()
            .map_err(|error| Error::WindowOperation(error.to_string()))?;
        if background_urls.contains_key(&label) {
            false
        } else {
            background_urls.insert(label.clone(), original_url);
            true
        }
    };

    if let Err(error) = window.navigate(url) {
        if inserted {
            state
                .background_urls
                .lock()
                .map_err(|lock_error| Error::WindowOperation(lock_error.to_string()))?
                .remove(&label);
        }
        return Err(error.into());
    }

    Ok(())
}

pub(crate) fn navigate_background_surface<R: Runtime>(
    state: &SurfaceState,
    window: &WebviewWindow<R>,
    url: Url,
) -> Result<()> {
    let _operation = lock_operation(state)?;

    match active_background_interaction(state, window.label()) {
        Ok(_) => navigate_background_unlocked(state, window, url),
        Err(Error::NotBackgroundSurface(_)) => {
            let parent = window.as_ref().window();
            let label = website_background_webview_label(window.label());
            let child = if let Some(child) = parent
                .webviews()
                .into_iter()
                .find(|webview| webview.label() == label)
            {
                child.navigate(url.clone())?;
                child
            } else {
                parent.add_child(
                    WebviewBuilder::new(&label, WebviewUrl::External(url))
                        .auto_resize()
                        .focused(false),
                    LogicalPosition::new(0, 0),
                    parent.inner_size()?,
                )?
            };

            place_website_background_below(window, &child)?;
            set_surface_transparent(window)?;
            child.show()?;
            Ok(())
        }
        Err(error) => Err(error),
    }
}

pub(crate) fn navigate_background_webview<R: Runtime>(
    state: &SurfaceState,
    main_webview: &Webview<R>,
    url: Url,
) -> Result<()> {
    let _operation = lock_operation(state)?;
    let label = website_background_webview_label(main_webview.label());
    let parent = main_webview.window();
    let child = parent
        .webviews()
        .into_iter()
        .find(|webview| webview.label() == label)
        .ok_or_else(|| {
            Error::WindowOperation(format!(
                "website background webview '{label}' was not found"
            ))
        })?;

    child.navigate(url)?;
    Ok(())
}

pub(crate) fn restore_background_content<R: Runtime>(
    state: &SurfaceState,
    window: &WebviewWindow<R>,
) -> Result<()> {
    let _operation = lock_operation(state)?;
    restore_background_content_unlocked(state, window)
}

pub(crate) fn restore_background_webview<R: Runtime>(
    state: &SurfaceState,
    main_webview: &Webview<R>,
) -> Result<()> {
    let _operation = lock_operation(state)?;
    let parent = main_webview.window();
    let label = website_background_webview_label(main_webview.label());

    if let Some(child) = parent
        .webviews()
        .into_iter()
        .find(|webview| webview.label() == label)
    {
        child.close()?;
    }

    reset_surface_corner_radius(&parent)?;

    let original_url = state
        .background_urls
        .lock()
        .map_err(|error| Error::WindowOperation(error.to_string()))?
        .get(main_webview.label())
        .cloned();

    if let Some(original_url) = original_url {
        main_webview.navigate(original_url)?;
        state
            .background_urls
            .lock()
            .map_err(|error| Error::WindowOperation(error.to_string()))?
            .remove(main_webview.label());
    }

    Ok(())
}

pub(crate) fn set_background<R: Runtime>(
    state: &SurfaceState,
    window: &WebviewWindow<R>,
    interaction: BackgroundInteraction,
) -> Result<()> {
    let _operation = lock_operation(state)?;
    close_website_background(window.as_ref())?;
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
        show_background_surface(&window, interaction)?;
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
    corner_radius: Option<f64>,
) -> Result<()> {
    let _operation = lock_operation(state)?;
    close_website_background(window.as_ref())?;
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

pub(crate) fn restore<R: Runtime>(state: &SurfaceState, window: &WebviewWindow<R>) -> Result<()> {
    let _operation = lock_operation(state)?;
    restore_background_content_unlocked(state, window)?;
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
