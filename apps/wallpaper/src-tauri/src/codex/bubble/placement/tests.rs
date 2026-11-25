use super::*;

#[test]
fn direct_drag_preserves_direction_and_follows_the_pointer_through_the_character() {
    for anchor in [Anchor::Top, Anchor::Bottom] {
        let speech = Speech {
            anchor: Some(anchor),
            enabled: true,
            x: 0.5,
            y: 0.2,
            ..Speech::default()
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
                ..Speech::default()
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
            let (top, bottom) = content_insets(&canvas, canvas.position.y, canvas.height, scale);
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
        ..Speech::default()
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
            ..Speech::default()
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
        ..Speech::default()
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
        ..Speech::default()
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
        ..Speech::default()
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
                ..Speech::default()
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
        Some(crate::hit_test::HitBounds {
            x: 0.0,
            y: 0.0,
            width: 1.0,
            height: 1.0,
        }),
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
        Some(crate::hit_test::HitBounds {
            x: 0.0,
            y: 0.0,
            width: 1.0,
            height: 1.0,
        }),
    );
    assert_eq!(target.x, -140.0);
    assert_eq!(target.y, 26.0);
}

#[test]
fn targets_the_visible_character_instead_of_the_transparent_widget_frame() {
    let target = relative_target(
        PhysicalPosition::new(1000, 200),
        PhysicalSize::new(1000, 1200),
        PhysicalPosition::new(600, 100),
        2.0,
        Some(crate::hit_test::HitBounds {
            x: 0.1,
            y: 0.4,
            width: 0.4,
            height: 0.5,
        }),
    );
    assert!(target.visible);
    assert!((target.x - 350.0).abs() < 0.000001);
    assert!((target.y - 380.0).abs() < 0.000001);
}

#[test]
fn omits_the_tail_until_a_nonempty_character_has_rendered() {
    let target = relative_target(
        PhysicalPosition::new(0, 0),
        PhysicalSize::new(320, 420),
        PhysicalPosition::new(0, 0),
        1.0,
        None,
    );
    assert!(!target.visible);
    assert_eq!(target.widget_width, 320.0);
}
