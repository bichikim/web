use super::placement::{Placement, content_insets, placement, relative_target, screen_canvas};
use super::{Anchor, POSITION_EVENT, Speech, Target};
use tauri::{AppHandle, Emitter, Manager, PhysicalSize, WebviewUrl, WebviewWindowBuilder};

#[cfg(target_os = "macos")]
use super::frame;

const WINDOW_WIDTH: f64 = 320.0;

fn placement_size(window: &tauri::WebviewWindow) -> Result<PhysicalSize<u32>, String> {
    // A macOS content view can retain its initial size after its native frame has resized.
    #[cfg(target_os = "macos")]
    let size = window.outer_size();
    #[cfg(not(target_os = "macos"))]
    let size = window.inner_size();
    size.map_err(|error| error.to_string())
}

pub fn target(app: &AppHandle, id: &str) -> Result<Option<Target>, String> {
    let Some(widget) = app.get_webview_window(&format!("poffo-widget-{id}")) else {
        return Ok(None);
    };
    let Some(bubble) = app.get_webview_window(&label(id)) else {
        return Ok(None);
    };
    let speech = app
        .state::<crate::codex::Bridge>()
        .0
        .lock()
        .map_err(|error| error.to_string())?
        .widgets
        .get(id)
        .cloned()
        .unwrap_or_default();
    let layout = window_placement(&widget, &bubble, &speech, placement_size(&bubble)?)?;
    let origin = bubble.outer_position().map_err(|error| error.to_string())?;
    let bounds = placement_size(&bubble)?;
    let scale = bubble.scale_factor().map_err(|error| error.to_string())?;
    let widget_origin = widget.outer_position().map_err(|error| error.to_string())?;
    let widget_size = placement_size(&widget)?;
    let character = crate::hit_test::bounds(app, widget.label());
    let mut point = relative_target(widget_origin, widget_size, origin, scale, character);
    point.position_x =
        (f64::from(origin.x - widget_origin.x) + 24.0 * scale) / f64::from(widget_size.width);
    let anchor_y = layout.edge_y
        + if matches!(layout.anchor, Anchor::Bottom) {
            -24.0 * scale
        } else {
            24.0 * scale
        };
    point.position_y = (anchor_y - f64::from(widget_origin.y)) / f64::from(widget_size.height);
    point.max_height = layout.max_height;
    point.anchor = layout.anchor;
    (point.inset_top, point.inset_bottom) = content_insets(&layout, origin.y, bounds.height, scale);
    Ok(Some(point))
}

pub fn emit_target(app: &AppHandle, id: &str) -> Result<(), String> {
    if let Some(point) = target(app, id)? {
        app.emit_to(label(id), POSITION_EVENT, point)
            .map_err(|error| error.to_string())?;
    }
    Ok(())
}

fn label(id: &str) -> String {
    format!("poffo-bubble-{id}")
}

fn window_placement(
    widget: &tauri::WebviewWindow,
    bubble: &tauri::WebviewWindow,
    speech: &Speech,
    bounds: PhysicalSize<u32>,
) -> Result<Placement, String> {
    let area = widget
        .current_monitor()
        .map_err(|error| error.to_string())?
        .map(|monitor| {
            let area = monitor.work_area();
            (area.position, area.size)
        });
    Ok(placement(
        widget.outer_position().map_err(|error| error.to_string())?,
        placement_size(widget)?,
        speech,
        bubble.scale_factor().map_err(|error| error.to_string())?,
        area,
        bounds,
    ))
}

pub fn resize(app: &AppHandle, id: &str, speech: &Speech, height: f64) -> Result<(), String> {
    update(app, id, speech, Some(height))
}

pub fn position(app: &AppHandle, id: &str, speech: &Speech) -> Result<(), String> {
    update(app, id, speech, None)
}

fn update(app: &AppHandle, id: &str, speech: &Speech, height: Option<f64>) -> Result<(), String> {
    let handle = app.clone();
    let id = id.to_owned();
    let speech = speech.clone();
    app.run_on_main_thread(move || {
        if let Err(error) = apply(&handle, &id, &speech, height) {
            eprintln!("Poffo speech placement failed: {error}");
        }
    })
    .map_err(|error| error.to_string())
}

fn apply(app: &AppHandle, id: &str, speech: &Speech, height: Option<f64>) -> Result<(), String> {
    let Some(widget) = app.get_webview_window(&format!("poffo-widget-{id}")) else {
        return Ok(());
    };
    let Some(bubble) = app.get_webview_window(&label(id)) else {
        return Ok(());
    };
    let scale = bubble.scale_factor().map_err(|error| error.to_string())?;
    let size = placement_size(&bubble)?;
    let requested = PhysicalSize::new(
        size.width.max((WINDOW_WIDTH * scale).round() as u32),
        height
            .map(|value| (value * scale).round() as u32)
            .unwrap_or(size.height),
    );
    let mut layout = window_placement(&widget, &bubble, speech, requested)?;
    if let Some(monitor) = widget
        .current_monitor()
        .map_err(|error| error.to_string())?
    {
        let area = monitor.work_area();
        layout = screen_canvas(layout, (area.position, area.size), scale);
    }
    apply_frame(&bubble, &layout)?;
    emit_target(app, id)
}

#[cfg(target_os = "macos")]
fn apply_frame(bubble: &tauri::WebviewWindow, layout: &Placement) -> Result<(), String> {
    let pointer = bubble.ns_window().map_err(|error| error.to_string())?;
    let native = unsafe { &*pointer.cast::<objc2_app_kit::NSWindow>() };
    let previous = native.frame();
    let next = frame::placed_frame(
        previous,
        bubble.outer_position().map_err(|error| error.to_string())?,
        layout.position,
        PhysicalSize::new(layout.width, layout.height),
        bubble.scale_factor().map_err(|error| error.to_string())?,
    );
    if previous != next {
        native.setFrame_display(next, true);
    }
    Ok(())
}

#[cfg(not(target_os = "macos"))]
fn apply_frame(bubble: &tauri::WebviewWindow, layout: &Placement) -> Result<(), String> {
    let bounds = bubble.inner_size().map_err(|error| error.to_string())?;
    if bounds.height != layout.height {
        bubble
            .set_size(PhysicalSize::new(bounds.width, layout.height))
            .map_err(|error| error.to_string())?;
    }
    if bubble.outer_position().map_err(|error| error.to_string())? != layout.position {
        bubble
            .set_position(layout.position)
            .map_err(|error| error.to_string())?;
    }
    Ok(())
}

pub fn synchronize(app: &AppHandle, id: &str, speech: &Speech) -> Result<(), String> {
    if app
        .get_webview_window(&format!("poffo-widget-{id}"))
        .is_none()
    {
        return Ok(());
    }
    let label = label(id);
    if !speech.visible() {
        if let Some(window) = app.get_webview_window(&label) {
            remove_menu_item(&window)?;
            window.hide().map_err(|error| error.to_string())?;
        }
        return Ok(());
    }
    let existing = app.get_webview_window(&label);
    let created = existing.is_none();
    let window = match existing {
        Some(window) => window,
        None => WebviewWindowBuilder::new(
            app,
            &label,
            WebviewUrl::App(format!("index.html?surface=widget-bubble&widget={id}").into()),
        )
        .title(crate::locale::text(app, "Poffo 대화"))
        .inner_size(WINDOW_WIDTH, 180.0)
        .decorations(false)
        .resizable(false)
        .shadow(false)
        .transparent(true)
        .always_on_top(true)
        .visible_on_all_workspaces(true)
        // Keep macOS Window-menu access so stacked notifications can be scrolled with the keyboard.
        .skip_taskbar(!cfg!(target_os = "macos"))
        .focusable(true)
        .accept_first_mouse(true)
        .background_throttling(tauri::utils::config::BackgroundThrottlingPolicy::Disabled)
        .focused(false)
        .visible(false)
        .build()
        .map_err(|error| error.to_string())?,
    };
    if created || !window.is_visible().map_err(|error| error.to_string())? {
        position(app, id, speech)?;
        show(&window)?;
    }
    Ok(())
}

#[cfg(target_os = "macos")]
fn show(window: &tauri::WebviewWindow) -> Result<(), String> {
    let handle = window.clone();
    window
        .run_on_main_thread(move || {
            if let Ok(pointer) = handle.ns_window() {
                let native = unsafe { &*pointer.cast::<objc2_app_kit::NSWindow>() };
                if let Some(marker) = objc2::MainThreadMarker::new() {
                    objc2_app_kit::NSApplication::sharedApplication(marker)
                        .addWindowsItem_title_filename(native, &native.title(), false);
                }
                native.orderFrontRegardless();
                crate::hit_test::refresh(handle.app_handle());
            }
        })
        .map_err(|error| error.to_string())
}

#[cfg(target_os = "macos")]
fn remove_menu_item(window: &tauri::WebviewWindow) -> Result<(), String> {
    let handle = window.clone();
    window
        .run_on_main_thread(move || {
            if let Ok(pointer) = handle.ns_window()
                && let Some(marker) = objc2::MainThreadMarker::new()
            {
                let native = unsafe { &*pointer.cast::<objc2_app_kit::NSWindow>() };
                objc2_app_kit::NSApplication::sharedApplication(marker).removeWindowsItem(native);
            }
        })
        .map_err(|error| error.to_string())
}

#[cfg(not(target_os = "macos"))]
fn remove_menu_item(_window: &tauri::WebviewWindow) -> Result<(), String> {
    Ok(())
}

#[cfg(not(target_os = "macos"))]
fn show(window: &tauri::WebviewWindow) -> Result<(), String> {
    window.show().map_err(|error| error.to_string())?;
    crate::hit_test::refresh(window.app_handle());
    Ok(())
}

pub fn close(app: &AppHandle, id: &str) {
    if let Some(window) = app.get_webview_window(&label(id)) {
        let _ = remove_menu_item(&window);
        let _ = window.close();
    }
}
