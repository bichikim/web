use super::{Anchor, Speech, Target};
use tauri::{PhysicalPosition, PhysicalSize};

pub(super) fn relative_target(
    origin: PhysicalPosition<i32>,
    size: PhysicalSize<u32>,
    bubble: PhysicalPosition<i32>,
    scale: f64,
    character: Option<crate::hit_test::HitBounds>,
) -> Target {
    let (x, y) = character
        .map(|bounds| {
            (
                bounds.x + bounds.width * 0.5,
                bounds.y + bounds.height * 0.3,
            )
        })
        .unwrap_or((0.5, 0.3));
    Target {
        visible: character.is_some(),
        position_x: 0.0,
        position_y: 0.0,
        widget_width: f64::from(size.width) / scale,
        widget_height: f64::from(size.height) / scale,
        anchor: Anchor::Bottom,
        x: (f64::from(origin.x - bubble.x) + f64::from(size.width) * x) / scale,
        y: (f64::from(origin.y - bubble.y) + f64::from(size.height) * y) / scale,
        max_height: 640.0,
        inset_top: 0.0,
        inset_bottom: 0.0,
    }
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

pub(super) struct Placement {
    pub(super) anchor: Anchor,
    pub(super) position: PhysicalPosition<i32>,
    pub(super) height: u32,
    #[cfg(target_os = "macos")]
    pub(super) width: u32,
    pub(super) max_height: f64,
    pub(super) edge_y: f64,
}

pub(super) fn content_insets(
    layout: &Placement,
    origin_y: i32,
    height: u32,
    scale: f64,
) -> (f64, f64) {
    let edge = (layout.edge_y - f64::from(origin_y)) / scale;
    match layout.anchor {
        Anchor::Top => (edge.max(0.0), 0.0),
        Anchor::Bottom => (0.0, (f64::from(height) / scale - edge).max(0.0)),
    }
}

pub(super) fn placement(
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
        #[cfg(target_os = "macos")]
        width: bounds.width,
        max_height,
        edge_y: edge,
    }
}

pub(super) fn screen_canvas(
    mut layout: Placement,
    area: (PhysicalPosition<i32>, PhysicalSize<u32>),
    scale: f64,
) -> Placement {
    let margin = (8.0 * scale).round() as u32;
    layout.position.y = area.0.y + margin as i32;
    layout.height = area.1.height.saturating_sub(margin * 2).max(1);
    layout
}

#[cfg(test)]
mod tests;
