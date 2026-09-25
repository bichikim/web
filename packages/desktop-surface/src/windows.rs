use crate::{
    error::{Error, Result},
    model::{BackgroundInteraction, ValidatedBackgroundMouseEvent},
};
use std::{
    collections::HashMap,
    sync::{Mutex, MutexGuard, mpsc},
};
use tauri::{
    LogicalPosition, LogicalSize, Manager, PhysicalPosition, PhysicalSize, Runtime, Url, Webview,
    WebviewBuilder, WebviewUrl, WebviewWindow, Window,
};
use windows::{
    Win32::{
        Foundation::{
            COLORREF, ERROR_SUCCESS, GetLastError, HWND, LPARAM, POINT, SetLastError, WPARAM,
        },
        Graphics::Gdi::{CreateRoundRectRgn, DeleteObject, ScreenToClient, SetWindowRgn},
        UI::WindowsAndMessaging::*,
    },
    core::w,
};

#[derive(Clone, Copy)]
struct Snapshot {
    position: PhysicalPosition<i32>,
    size: PhysicalSize<u32>,
    decorated: bool,
    resizable: bool,
    topmost: bool,
    shadow: bool,
    style: isize,
    extended_style: isize,
    parent: usize,
    min_size: Option<LogicalSize<f64>>,
}

#[derive(Default)]
pub(crate) struct SurfaceState {
    operation: Mutex<()>,
    snapshots: Mutex<HashMap<String, Snapshot>>,
    backgrounds: Mutex<HashMap<String, BackgroundInteraction>>,
    urls: Mutex<HashMap<String, Url>>,
}

fn failure(error: impl std::fmt::Display) -> Error {
    Error::WindowOperation(error.to_string())
}
fn lock<T>(value: &Mutex<T>) -> Result<MutexGuard<'_, T>> {
    value.lock().map_err(failure)
}

fn native<R: Runtime, T: Send + 'static>(
    window: &Window<R>,
    operation: impl FnOnce(HWND) -> Result<T> + Send + 'static,
) -> Result<T> {
    let handle = window.hwnd()?.0 as usize;
    let (sender, receiver) = mpsc::sync_channel(1);
    window.run_on_main_thread(move || {
        let _ = sender.send(operation(HWND(handle as _)));
    })?;
    receiver.recv().map_err(failure)?
}

fn baseline<R: Runtime>(state: &SurfaceState, window: &Window<R>) -> Result<Snapshot> {
    if let Some(snapshot) = lock(&state.snapshots)?.get(window.label()).copied() {
        return Ok(snapshot);
    }
    let config = window
        .app_handle()
        .config()
        .app
        .windows
        .iter()
        .find(|config| config.label == window.label())
        .cloned();
    let (style, extended_style, parent) = native(window, |hwnd| unsafe {
        Ok((
            GetWindowLongPtrW(hwnd, GWL_STYLE),
            GetWindowLongPtrW(hwnd, GWL_EXSTYLE),
            GetParent(hwnd).unwrap_or_default().0 as usize,
        ))
    })?;
    let snapshot = Snapshot {
        position: window.outer_position()?,
        size: window.inner_size()?,
        decorated: window.is_decorated()?,
        resizable: window.is_resizable()?,
        topmost: window.is_always_on_top()?,
        style,
        extended_style,
        parent,
        shadow: config.as_ref().is_none_or(|config| config.shadow),
        min_size: config.and_then(|config| match (config.min_width, config.min_height) {
            (None, None) => None,
            (width, height) => Some(LogicalSize::new(
                width.unwrap_or(0.0),
                height.unwrap_or(0.0),
            )),
        }),
    };
    lock(&state.snapshots)?.insert(window.label().to_owned(), snapshot);
    Ok(snapshot)
}

unsafe fn reparent(hwnd: HWND, parent: Option<HWND>) -> Result<()> {
    unsafe {
        SetLastError(ERROR_SUCCESS);
        let result = SetParent(hwnd, parent);
        if result.is_err() && GetLastError() != ERROR_SUCCESS {
            return Err(failure(windows::core::Error::from_win32()));
        }
    }
    Ok(())
}

fn apply_snapshot<R: Runtime>(window: &Window<R>, snapshot: Snapshot) -> Result<()> {
    window.set_ignore_cursor_events(false)?;
    window.set_always_on_bottom(false)?;
    native(window, move |hwnd| unsafe {
        reparent(
            hwnd,
            (snapshot.parent != 0).then_some(HWND(snapshot.parent as _)),
        )?;
        SetWindowLongPtrW(hwnd, GWL_STYLE, snapshot.style);
        SetWindowLongPtrW(hwnd, GWL_EXSTYLE, snapshot.extended_style);
        SetWindowRgn(hwnd, None, true);
        SetWindowPos(
            hwnd,
            None,
            0,
            0,
            0,
            0,
            SWP_NOMOVE | SWP_NOSIZE | SWP_NOZORDER | SWP_NOACTIVATE | SWP_FRAMECHANGED,
        )
        .map_err(failure)
    })?;
    window.set_decorations(snapshot.decorated)?;
    window.set_shadow(snapshot.shadow)?;
    window.set_resizable(snapshot.resizable)?;
    window.set_always_on_top(snapshot.topmost)?;
    window.set_skip_taskbar(snapshot.extended_style & WS_EX_TOOLWINDOW.0 as isize != 0)?;
    window.set_min_size(snapshot.min_size)?;
    window.set_position(snapshot.position)?;
    window.set_size(snapshot.size)?;
    Ok(())
}

#[derive(Default)]
struct DesktopHost {
    parent: usize,
    icons: usize,
    wallpaper: usize,
    raised: bool,
}

unsafe extern "system" fn find_shell(window: HWND, parameter: LPARAM) -> windows::core::BOOL {
    unsafe {
        if let Ok(icons) = FindWindowExW(Some(window), None, w!("SHELLDLL_DefView"), None) {
            let host = &mut *(parameter.0 as *mut DesktopHost);
            host.parent = window.0 as usize;
            host.icons = icons.0 as usize;
            host.wallpaper = FindWindowExW(None, Some(window), w!("WorkerW"), None)
                .unwrap_or_default()
                .0 as usize;
        }
    }
    true.into()
}

fn desktop_host() -> Result<DesktopHost> {
    unsafe {
        let progman = FindWindowW(w!("Progman"), None).map_err(failure)?;
        // Explorer's wallpaper host protocol is not a public Win32 contract. Fail when its expected windows are absent.
        let mut response = 0;
        SendMessageTimeoutW(
            progman,
            0x052c,
            WPARAM(0xd),
            LPARAM(1),
            SMTO_ABORTIFHUNG,
            1000,
            Some(&mut response),
        );
        let mut host = DesktopHost::default();
        EnumWindows(Some(find_shell), LPARAM(&mut host as *mut _ as isize)).map_err(failure)?;
        host.raised =
            GetWindowLongPtrW(progman, GWL_EXSTYLE) & WS_EX_NOREDIRECTIONBITMAP.0 as isize != 0;
        if host.raised {
            host.parent = progman.0 as usize;
            host.icons = FindWindowExW(Some(progman), None, w!("SHELLDLL_DefView"), None)
                .map_err(failure)?
                .0 as usize;
            host.wallpaper = FindWindowExW(Some(progman), None, w!("WorkerW"), None)
                .map_err(failure)?
                .0 as usize;
        }
        if host.parent == 0 || host.icons == 0 || host.wallpaper == 0 {
            return Err(failure(
                "Explorer wallpaper host was not found; no desktop placement was applied",
            ));
        }
        Ok(host)
    }
}

fn apply_background<R: Runtime>(
    window: &Window<R>,
    interaction: BackgroundInteraction,
) -> Result<()> {
    let monitor = window
        .current_monitor()?
        .or(window.primary_monitor()?)
        .ok_or_else(|| failure("no monitor is available"))?;
    let position = *monitor.position();
    let size = *monitor.size();
    let host = native(window, |_| desktop_host())?;
    window.set_min_size(None::<LogicalSize<f64>>)?;
    window.set_decorations(false)?;
    window.set_shadow(false)?;
    window.set_resizable(false)?;
    window.set_always_on_top(false)?;
    window.set_skip_taskbar(true)?;
    window.set_ignore_cursor_events(interaction == BackgroundInteraction::PassThrough)?;
    native(window, move |hwnd| unsafe {
        let parent = HWND(
            if host.raised || interaction == BackgroundInteraction::Interactive {
                host.parent
            } else {
                host.wallpaper
            } as _,
        );
        let style = GetWindowLongPtrW(hwnd, GWL_STYLE);
        SetWindowLongPtrW(
            hwnd,
            GWL_STYLE,
            (style & !(WS_POPUP.0 as isize)) | WS_CHILD.0 as isize,
        );
        if host.raised {
            SetWindowLongPtrW(
                hwnd,
                GWL_EXSTYLE,
                GetWindowLongPtrW(hwnd, GWL_EXSTYLE) | WS_EX_LAYERED.0 as isize,
            );
            SetLayeredWindowAttributes(hwnd, COLORREF(0), 255, LWA_ALPHA).map_err(failure)?;
        }
        reparent(hwnd, Some(parent))?;
        SetWindowRgn(hwnd, None, true);
        let mut point = POINT {
            x: position.x,
            y: position.y,
        };
        ScreenToClient(parent, &mut point).ok().map_err(failure)?;
        let after = if interaction == BackgroundInteraction::Interactive {
            HWND_TOP
        } else if host.raised {
            HWND(host.icons as _)
        } else {
            HWND_BOTTOM
        };
        SetWindowPos(
            hwnd,
            Some(after),
            point.x,
            point.y,
            size.width as i32,
            size.height as i32,
            SWP_FRAMECHANGED | SWP_NOACTIVATE | SWP_SHOWWINDOW,
        )
        .map_err(failure)?;
        if host.raised {
            SetWindowPos(
                HWND(host.wallpaper as _),
                Some(HWND_BOTTOM),
                0,
                0,
                0,
                0,
                SWP_NOMOVE | SWP_NOSIZE | SWP_NOACTIVATE,
            )
            .map_err(failure)?;
        }
        Ok(())
    })?;
    Ok(())
}

pub(crate) fn set_background<R: Runtime>(
    state: &SurfaceState,
    window: &Window<R>,
    interaction: BackgroundInteraction,
) -> Result<()> {
    let _operation = lock(&state.operation)?;
    let snapshot = baseline(state, window)?;
    apply_snapshot(window, snapshot)?;
    apply_background(window, interaction)?;
    lock(&state.backgrounds)?.insert(window.label().to_owned(), interaction);
    Ok(())
}

pub(crate) fn get_background_interaction(
    state: &SurfaceState,
    label: &str,
) -> Result<BackgroundInteraction> {
    lock(&state.backgrounds)?
        .get(label)
        .copied()
        .ok_or_else(|| Error::NotBackgroundSurface(label.to_owned()))
}

pub(crate) fn set_background_interaction<R: Runtime>(
    state: &SurfaceState,
    window: &Window<R>,
    interaction: BackgroundInteraction,
) -> Result<()> {
    get_background_interaction(state, window.label())?;
    set_background(state, window, interaction)
}

pub(crate) trait NativeWindowHandle<R: Runtime> {
    fn surface_window(&self) -> Window<R>;
}
impl<R: Runtime> NativeWindowHandle<R> for Window<R> {
    fn surface_window(&self) -> Window<R> {
        self.clone()
    }
}
impl<R: Runtime> NativeWindowHandle<R> for WebviewWindow<R> {
    fn surface_window(&self) -> Window<R> {
        AsRef::<Webview<R>>::as_ref(self).window()
    }
}

pub(crate) fn set_control_surface_corner_radius<R: Runtime, W: NativeWindowHandle<R>>(
    window: &W,
    radius: f64,
) -> Result<()> {
    let window = window.surface_window();
    let size = window.inner_size()?;
    let diameter = (radius * window.scale_factor()? * 2.0).round() as i32;
    native(&window, move |hwnd| unsafe {
        let region = CreateRoundRectRgn(
            0,
            0,
            size.width as i32 + 1,
            size.height as i32 + 1,
            diameter,
            diameter,
        );
        if region.0.is_null() {
            return Err(failure(windows::core::Error::from_win32()));
        }
        if SetWindowRgn(hwnd, Some(region), true) == 0 {
            let _ = DeleteObject(region.into());
            return Err(failure(windows::core::Error::from_win32()));
        }
        Ok(())
    })
}

pub(crate) fn set_control_surface_shadow<R: Runtime, W: NativeWindowHandle<R>>(
    window: &W,
) -> Result<()> {
    // Tauri's undecorated shadow adds a visible non-client border to transparent WebViews.
    window
        .surface_window()
        .set_shadow(false)
        .map_err(Into::into)
}

pub(crate) fn set_widget<R: Runtime>(
    state: &SurfaceState,
    window: &Window<R>,
    width: f64,
    height: f64,
    radius: Option<f64>,
) -> Result<()> {
    let _operation = lock(&state.operation)?;
    let snapshot = baseline(state, window)?;
    apply_snapshot(window, snapshot)?;
    window.set_min_size(None::<LogicalSize<f64>>)?;
    window.set_decorations(false)?;
    window.set_shadow(false)?;
    window.set_resizable(false)?;
    window.set_always_on_top(true)?;
    window.set_size(LogicalSize::new(width, height))?;
    if let Some(radius) = radius {
        set_control_surface_corner_radius(window, radius)?;
    }
    window.center()?;
    window.show()?;
    window.set_focus()?;
    lock(&state.backgrounds)?.remove(window.label());
    Ok(())
}

fn child_label<R: Runtime>(window: &Window<R>) -> String {
    format!("{}__website_background", window.label())
}
fn restore_content<R: Runtime>(
    state: &SurfaceState,
    window: &Window<R>,
    main: &Webview<R>,
) -> Result<()> {
    if let Some(child) = window.app_handle().get_webview(&child_label(window)) {
        child.close()?;
    }
    let original_url = lock(&state.urls)?.get(window.label()).cloned();
    if let Some(url) = original_url {
        main.navigate(url)?;
        lock(&state.urls)?.remove(window.label());
    }
    Ok(())
}

pub(crate) fn restore_background_content<R: Runtime>(
    state: &SurfaceState,
    window: &Window<R>,
    main: &Webview<R>,
) -> Result<()> {
    let _operation = lock(&state.operation)?;
    restore_content(state, window, main)
}

pub(crate) fn restore<R: Runtime>(
    state: &SurfaceState,
    window: &Window<R>,
    main: &Webview<R>,
) -> Result<()> {
    let _operation = lock(&state.operation)?;
    restore_content(state, window, main)?;
    let snapshot = lock(&state.snapshots)?.get(window.label()).copied();
    if let Some(snapshot) = snapshot {
        apply_snapshot(window, snapshot)?;
        window.show()?;
        window.set_focus()?;
        lock(&state.snapshots)?.remove(window.label());
    }
    lock(&state.backgrounds)?.remove(window.label());
    Ok(())
}

pub(crate) fn navigate_background_surface<R: Runtime>(
    state: &SurfaceState,
    window: &Window<R>,
    main: &Webview<R>,
    url: Url,
    use_child: bool,
) -> Result<()> {
    let _operation = lock(&state.operation)?;
    if !use_child && lock(&state.backgrounds)?.contains_key(window.label()) {
        let original = main.url()?;
        main.navigate(url)?;
        lock(&state.urls)?
            .entry(window.label().to_owned())
            .or_insert(original);
        return Ok(());
    }
    let label = child_label(window);
    let child = if let Some(child) = window.app_handle().get_webview(&label) {
        child.navigate(url)?;
        child
    } else {
        window.add_child(
            WebviewBuilder::new(&label, WebviewUrl::External(url))
                .auto_resize()
                .focused(false),
            LogicalPosition::new(0.0, 0.0),
            window.inner_size()?,
        )?
    };
    let (sender, receiver) = mpsc::sync_channel(1);
    child.with_webview(move |platform| {
        let result = unsafe {
            let mut host = HWND::default();
            platform
                .controller()
                .ParentWindow(&mut host)
                .map_err(failure)
                .and_then(|()| {
                    SetWindowPos(
                        host,
                        Some(HWND_BOTTOM),
                        0,
                        0,
                        0,
                        0,
                        SWP_NOMOVE | SWP_NOSIZE | SWP_NOACTIVATE,
                    )
                    .map_err(failure)
                })
        };
        let _ = sender.send(result);
    })?;
    receiver.recv().map_err(failure)??;
    child.show()?;
    Ok(())
}

pub(crate) fn forward_background_mouse_event<R: Runtime>(
    state: &SurfaceState,
    main: &Webview<R>,
    event: ValidatedBackgroundMouseEvent,
) -> Result<()> {
    let _operation = lock(&state.operation)?;
    if let Some(child) = main.app_handle().get_webview(&child_label(&main.window())) {
        child.eval(crate::pointer::website_mouse_event_script(&event))?;
    }
    Ok(())
}

#[cfg(test)]
mod tests;
