use serde::{Deserialize, Serialize};
use tauri::{
    AppHandle, Emitter, Manager, PhysicalPosition, PhysicalSize, WebviewUrl, WebviewWindowBuilder,
};

pub const POSITION_EVENT: &str = "poffo-speech-target";
const WINDOW_WIDTH: f64 = 320.0;

#[cfg(target_os = "macos")]
mod frame;

#[derive(Clone, Copy, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub enum Anchor {
    Top,
    Bottom,
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Target {
    position_x: f64,
    position_y: f64,
    widget_width: f64,
    widget_height: f64,
    anchor: Anchor,
    x: f64,
    y: f64,
    max_height: f64,
    inset_top: f64,
    inset_bottom: f64,
}

fn relative_target(
    origin: PhysicalPosition<i32>,
    size: PhysicalSize<u32>,
    bubble: PhysicalPosition<i32>,
    scale: f64,
) -> Target {
    Target {
        position_x: 0.0,
        position_y: 0.0,
        widget_width: f64::from(size.width) / scale,
        widget_height: f64::from(size.height) / scale,
        anchor: Anchor::Bottom,
        x: (f64::from(origin.x - bubble.x) + f64::from(size.width) * 0.5) / scale,
        y: (f64::from(origin.y - bubble.y) + f64::from(size.height) * 0.3) / scale,
        max_height: 640.0,
        inset_top: 0.0,
        inset_bottom: 0.0,
    }
}

pub fn target(app: &AppHandle, id: &str) -> Result<Option<Target>, String> {
    let Some(widget) = app.get_webview_window(&format!("poffo-widget-{id}")) else {
        return Ok(None);
    };
    let Some(bubble) = app.get_webview_window(&label(id)) else {
        return Ok(None);
    };
    let speech = app
        .state::<super::Bridge>()
        .0
        .lock()
        .map_err(|error| error.to_string())?
        .widgets
        .get(id)
        .cloned()
        .unwrap_or_default();
    let layout = window_placement(
        &widget,
        &bubble,
        &speech,
        bubble.inner_size().map_err(|error| error.to_string())?,
    )?;
    let origin = bubble.outer_position().map_err(|error| error.to_string())?;
    let bounds = bubble.inner_size().map_err(|error| error.to_string())?;
    let scale = bubble.scale_factor().map_err(|error| error.to_string())?;
    let widget_origin = widget.outer_position().map_err(|error| error.to_string())?;
    let widget_size = widget.inner_size().map_err(|error| error.to_string())?;
    let mut point = relative_target(widget_origin, widget_size, origin, scale);
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

#[derive(Clone, Deserialize, Serialize)]
pub struct Speech {
    #[serde(default)]
    pub anchor: Option<Anchor>,
    pub enabled: bool,
    pub x: f64,
    pub y: f64,
}
impl Default for Speech {
    fn default() -> Self {
        Self {
            anchor: None,
            enabled: true,
            x: 0.9,
            y: 0.05,
        }
    }
}

fn label(id: &str) -> String {
    format!("poffo-bubble-{id}")
}

fn padded_origin(
    origin: PhysicalPosition<i32>,
    size: PhysicalSize<u32>,
    speech: &Speech,
    scale: f64,
) -> PhysicalPosition<i32> {
    let padding = (24.0 * scale).round() as i32;
    PhysicalPosition::new(
        origin.x + (f64::from(size.width) * speech.x) as i32 - padding,
        origin.y + (f64::from(size.height) * speech.y) as i32 - padding,
    )
}

struct Placement {
    anchor: Anchor,
    position: PhysicalPosition<i32>,
    height: u32,
    width: u32,
    max_height: f64,
    edge_y: f64,
}

fn content_insets(layout: &Placement, origin_y: i32, height: u32, scale: f64) -> (f64, f64) {
    let edge = (layout.edge_y - f64::from(origin_y)) / scale;
    match layout.anchor {
        Anchor::Top => (edge.max(0.0), 0.0),
        Anchor::Bottom => (0.0, (f64::from(height) / scale - edge).max(0.0)),
    }
}

fn placement(
    origin: PhysicalPosition<i32>,
    size: PhysicalSize<u32>,
    speech: &Speech,
    scale: f64,
    area: Option<(PhysicalPosition<i32>, PhysicalSize<u32>)>,
    bounds: PhysicalSize<u32>,
) -> Placement {
    let padded = padded_origin(origin, size, speech, scale);
    let x = area
        .map(|(start, dimensions)| {
            let remaining = dimensions.width.saturating_sub(bounds.width) as i32;
            let inset = ((8.0 * scale).round() as i32).min(remaining / 2);
            padded.x.clamp(start.x + inset, start.x + remaining - inset)
        })
        .unwrap_or(padded.x);
    let above = speech
        .anchor
        .map(|anchor| matches!(anchor, Anchor::Bottom))
        .unwrap_or(speech.y <= 0.3);
    let overlaps_character = f64::from(x) + 36.0 * scale
        < f64::from(origin.x) + f64::from(size.width)
        && f64::from(x) + f64::from(bounds.width) - 36.0 * scale > f64::from(origin.x);
    let requested_anchor = f64::from(origin.y) + f64::from(size.height) * speech.y;
    let anchor = if speech.anchor.is_some() || !overlaps_character {
        requested_anchor
    } else if above {
        requested_anchor.min(f64::from(origin.y))
    } else {
        requested_anchor.max(f64::from(origin.y) + f64::from(size.height))
    };
    let edge = if above {
        anchor + 24.0 * scale
    } else {
        anchor - 24.0 * scale
    };
    let max_height = area
        .map(|(position, dimensions)| {
            let available = if above {
                edge - f64::from(position.y) - 8.0 * scale
            } else {
                f64::from(position.y) + f64::from(dimensions.height) - 8.0 * scale - edge
            } / scale;
            available
                .max(320.0)
                .min((f64::from(dimensions.height) / scale - 16.0).max(1.0))
        })
        .unwrap_or(640.0);
    let height = (f64::from(bounds.height) / scale).max(64.0).min(max_height);
    let height = (height * scale).round() as u32;
    let mut position = PhysicalPosition::new(
        x,
        if above {
            (edge - f64::from(height)).round() as i32
        } else {
            edge.round() as i32
        },
    );
    if let Some((start, dimensions)) = area {
        let margin = (8.0 * scale).round() as i32;
        let remaining_y = dimensions.height.saturating_sub(height) as i32;
        let inset_y = margin.min(remaining_y / 2);
        position.y = position
            .y
            .clamp(start.y + inset_y, start.y + remaining_y - inset_y);
    }
    Placement {
        anchor: if above { Anchor::Bottom } else { Anchor::Top },
        position,
        height,
        width: bounds.width,
        max_height,
        edge_y: edge,
    }
}

fn screen_canvas(
    mut layout: Placement,
    area: (PhysicalPosition<i32>, PhysicalSize<u32>),
    scale: f64,
) -> Placement {
    let margin = (8.0 * scale).round() as u32;
    layout.position.y = area.0.y + margin as i32;
    layout.height = area.1.height.saturating_sub(margin * 2).max(1);
    layout
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
        widget.inner_size().map_err(|error| error.to_string())?,
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
    let size = bubble.inner_size().map_err(|error| error.to_string())?;
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
        bubble.inner_size().map_err(|error| error.to_string())?,
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

pub fn synchronize(
    app: &AppHandle,
    id: &str,
    speech: &Speech,
    visible: bool,
) -> Result<(), String> {
    if app
        .get_webview_window(&format!("poffo-widget-{id}"))
        .is_none()
    {
        return Ok(());
    }
    let label = label(id);
    if !speech.enabled || !visible {
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
        .title("Poffo Codex 알림")
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

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn direct_drag_preserves_direction_and_follows_the_pointer_through_the_character() {
        for anchor in [Anchor::Top, Anchor::Bottom] {
            let speech = Speech {
                anchor: Some(anchor),
                enabled: true,
                x: 0.5,
                y: 0.2,
            };
            let before = placement(
                PhysicalPosition::new(600, 400),
                PhysicalSize::new(400, 600),
                &speech,
                2.0,
                None,
                PhysicalSize::new(640, 360),
            );
            let after = placement(
                PhysicalPosition::new(600, 400),
                PhysicalSize::new(400, 600),
                &Speech { y: 0.4, ..speech },
                2.0,
                None,
                PhysicalSize::new(640, 360),
            );
            assert!((after.edge_y - before.edge_y - 120.0).abs() < 0.001);
            assert!(matches!(
                (before.anchor, after.anchor),
                (Anchor::Top, Anchor::Top) | (Anchor::Bottom, Anchor::Bottom)
            ));
        }
    }

    #[test]
    fn minimum_content_height_does_not_shift_the_character_attachment_at_screen_edges() {
        for scale in [1.0, 2.0] {
            let area = (
                PhysicalPosition::new(0, (24.0 * scale) as i32),
                PhysicalSize::new((1920.0 * scale) as u32, (1056.0 * scale) as u32),
            );
            for above in [true, false] {
                let origin = PhysicalPosition::new(
                    (600.0 * scale) as i32,
                    ((if above { 50.0 } else { 900.0 }) * scale) as i32,
                );
                let speech = Speech {
                    x: 0.5,
                    y: if above { 0.0 } else { 1.0 },
                    anchor: None,
                    enabled: true,
                };
                let layout = placement(
                    origin,
                    PhysicalSize::new((320.0 * scale) as u32, (420.0 * scale) as u32),
                    &speech,
                    scale,
                    Some(area),
                    PhysicalSize::new((320.0 * scale) as u32, (1000.0 * scale) as u32),
                );
                assert_eq!(layout.max_height, 320.0);
                let edge = layout.edge_y;
                let canvas = screen_canvas(layout, area, scale);
                let (top, bottom) =
                    content_insets(&canvas, canvas.position.y, canvas.height, scale);
                let attachment = if above {
                    f64::from(canvas.height) / scale - bottom
                } else {
                    top
                };
                assert!((attachment - (edge - f64::from(canvas.position.y)) / scale).abs() < 0.001);
            }
        }
    }

    #[test]
    fn vertical_drag_changes_the_anchor_without_moving_or_resizing_the_screen_canvas() {
        for scale in [1.0, 2.0] {
            let area = (
                PhysicalPosition::new(-1920, 48),
                PhysicalSize::new(1920, 1400),
            );
            let mut previous = None;
            for y in [900, 700, 500, 700, 900] {
                let layout = placement(
                    PhysicalPosition::new(-1500, y),
                    PhysicalSize::new(320, 420),
                    &Speech::default(),
                    scale,
                    Some(area),
                    PhysicalSize::new((320.0 * scale) as u32, 1400),
                );
                let anchor = layout.position.y + layout.height as i32;
                let canvas = screen_canvas(layout, area, scale);
                let bounds = (canvas.position.y, canvas.height);
                if let Some(expected) = previous {
                    assert_eq!(bounds, expected);
                }
                previous = Some(bounds);
                assert!(anchor >= canvas.position.y);
                assert!(anchor <= canvas.position.y + canvas.height as i32);
            }
        }
    }

    #[test]
    fn clears_the_character_even_when_the_saved_anchor_is_inside_its_frame() {
        let area = Some((PhysicalPosition::new(0, 24), PhysicalSize::new(1920, 1056)));
        let speech = Speech {
            anchor: None,
            enabled: true,
            x: 0.5,
            y: 0.25,
        };
        let placed = placement(
            PhysicalPosition::new(600, 700),
            PhysicalSize::new(320, 420),
            &speech,
            1.0,
            area,
            PhysicalSize::new(344, 500),
        );
        assert_eq!(placed.position.y + placed.height as i32 - 36, 688);
        let beside = placement(
            PhysicalPosition::new(600, 700),
            PhysicalSize::new(320, 420),
            &Speech { x: 2.0, ..speech },
            1.0,
            area,
            PhysicalSize::new(344, 500),
        );
        assert_eq!(beside.position.y + beside.height as i32 - 36, 793);
    }

    #[test]
    fn avoids_the_character_after_the_screen_edge_pushes_a_side_bubble_inward() {
        let placed = placement(
            PhysicalPosition::new(1700, 700),
            PhysicalSize::new(220, 420),
            &Speech {
                anchor: None,
                enabled: true,
                x: 2.0,
                y: 0.25,
            },
            1.0,
            Some((PhysicalPosition::new(0, 24), PhysicalSize::new(1920, 1056))),
            PhysicalSize::new(344, 500),
        );
        assert_eq!(placed.position.x, 1568);
        assert_eq!(placed.position.y + placed.height as i32 - 36, 688);
    }

    #[test]
    fn longer_bubbles_and_stacked_titles_grow_up_without_moving_the_bottom_anchor() {
        let origin = PhysicalPosition::new(600, 700);
        let size = PhysicalSize::new(320, 420);
        let speech = Speech {
            anchor: None,
            enabled: true,
            x: 0.5,
            y: 0.0,
        };
        let area = Some((PhysicalPosition::new(0, 24), PhysicalSize::new(1920, 1056)));
        let short = placement(
            origin,
            size,
            &speech,
            1.0,
            area,
            PhysicalSize::new(344, 180),
        );
        let long = placement(
            origin,
            size,
            &speech,
            1.0,
            area,
            PhysicalSize::new(344, 500),
        );
        assert_eq!(
            short.position.y + short.height as i32,
            long.position.y + long.height as i32
        );
        assert_eq!(short.position.y - long.position.y, 320);
        assert!(long.position.y + long.height as i32 - 36 < origin.y);
    }

    #[test]
    fn uses_the_space_above_before_allowing_overlap_at_the_top_edge() {
        let area = Some((PhysicalPosition::new(0, 24), PhysicalSize::new(1920, 1056)));
        let speech = Speech {
            anchor: None,
            enabled: true,
            x: 0.5,
            y: 0.0,
        };
        let ample = placement(
            PhysicalPosition::new(600, 700),
            PhysicalSize::new(320, 420),
            &speech,
            1.0,
            area,
            PhysicalSize::new(344, 1000),
        );
        assert_eq!(ample.position.y, 32);
        assert_eq!(ample.max_height, 692.0);
        assert_eq!(ample.height, 692);
        let limited = placement(
            PhysicalPosition::new(600, 50),
            PhysicalSize::new(320, 420),
            &speech,
            1.0,
            area,
            PhysicalSize::new(344, 1000),
        );
        assert_eq!(limited.position.y, 32);
        assert_eq!(limited.max_height, 320.0);
        assert!(limited.position.y + limited.height as i32 - 36 > 50);
    }

    #[test]
    fn scales_the_limit_and_keeps_below_character_bubbles_growing_down() {
        let area = Some((
            PhysicalPosition::new(-2560, 48),
            PhysicalSize::new(2560, 1600),
        ));
        let speech = Speech {
            anchor: None,
            enabled: true,
            x: 0.5,
            y: 0.8,
        };
        let short = placement(
            PhysicalPosition::new(-1800, 200),
            PhysicalSize::new(640, 840),
            &speech,
            2.0,
            area,
            PhysicalSize::new(688, 360),
        );
        let long = placement(
            PhysicalPosition::new(-1800, 200),
            PhysicalSize::new(640, 840),
            &speech,
            2.0,
            area,
            PhysicalSize::new(688, 700),
        );
        assert_eq!(short.position.y, long.position.y);
        assert!(long.height > short.height);
        assert_eq!(long.max_height, 320.0);
        assert!(long.position.x < 0);
    }

    #[test]
    fn shadow_padding_preserves_the_saved_content_anchor_at_each_display_scale() {
        for scale in [1.0, 2.0] {
            let position = padded_origin(
                PhysicalPosition::new(-1200, 300),
                PhysicalSize::new(640, 840),
                &Speech {
                    anchor: None,
                    enabled: true,
                    x: 0.5,
                    y: 0.5,
                },
                scale,
            );
            assert_eq!(f64::from(position.x) + 36.0 * scale, -880.0 + 12.0 * scale);
            assert_eq!(f64::from(position.y) + 36.0 * scale, 720.0 + 12.0 * scale);
        }
    }

    #[test]
    fn target_uses_the_actual_clamped_bubble_origin_at_retina_scale() {
        let target = relative_target(
            PhysicalPosition::new(1800, 400),
            PhysicalSize::new(640, 840),
            PhysicalPosition::new(1500, 200),
            2.0,
        );
        assert_eq!(target.widget_width, 320.0);
        assert_eq!(target.widget_height, 420.0);
        assert_eq!(target.x, 310.0);
        assert_eq!(target.y, 226.0);
    }

    #[test]
    fn target_supports_monitors_left_of_the_primary_display() {
        let target = relative_target(
            PhysicalPosition::new(-1200, 300),
            PhysicalSize::new(320, 420),
            PhysicalPosition::new(-900, 400),
            1.0,
        );
        assert_eq!(target.x, -140.0);
        assert_eq!(target.y, 26.0);
    }
}
