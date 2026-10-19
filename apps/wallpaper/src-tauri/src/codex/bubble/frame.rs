use objc2_foundation::{NSPoint, NSRect, NSSize};
use tauri::{PhysicalPosition, PhysicalSize};

pub(super) fn placed_frame(
    current: NSRect,
    origin: PhysicalPosition<i32>,
    size: PhysicalSize<u32>,
    position: PhysicalPosition<i32>,
    bounds: PhysicalSize<u32>,
    scale: f64,
) -> NSRect {
    let growth = (f64::from(bounds.height) - f64::from(size.height)) / scale;
    NSRect::new(
        NSPoint::new(
            current.origin.x + (f64::from(position.x) - f64::from(origin.x)) / scale,
            current.origin.y + (f64::from(origin.y) - f64::from(position.y)) / scale - growth,
        ),
        NSSize::new(
            f64::from(bounds.width) / scale,
            f64::from(bounds.height) / scale,
        ),
    )
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn changing_height_and_top_together_preserves_the_cocoa_bottom_at_each_scale() {
        for scale in [1.0, 2.0] {
            for height in [200, 600] {
                let current = NSRect::new(NSPoint::new(-500.0, 100.0), NSSize::new(320.0, 400.0));
                let pixels = |value: i32| (f64::from(value) * scale) as i32;
                let next = placed_frame(
                    current,
                    PhysicalPosition::new(pixels(-500), pixels(300)),
                    PhysicalSize::new(pixels(320) as u32, pixels(400) as u32),
                    PhysicalPosition::new(pixels(-500), pixels(700 - height)),
                    PhysicalSize::new(pixels(320) as u32, pixels(height) as u32),
                    scale,
                );
                assert_eq!(next.origin, current.origin);
                assert_eq!(next.size.height, f64::from(height));
            }
        }
    }

    #[test]
    fn keeping_the_physical_top_fixed_moves_only_the_cocoa_bottom() {
        let current = NSRect::new(NSPoint::new(-500.0, 100.0), NSSize::new(320.0, 400.0));
        let next = placed_frame(
            current,
            PhysicalPosition::new(-1000, 600),
            PhysicalSize::new(640, 800),
            PhysicalPosition::new(-800, 600),
            PhysicalSize::new(640, 400),
            2.0,
        );
        assert_eq!(next.origin.x, -400.0);
        assert_eq!(
            next.origin.y + next.size.height,
            current.origin.y + current.size.height
        );
        assert_eq!(next.size.height, 200.0);
    }

    #[test]
    fn restores_a_zero_width_native_frame_from_the_requested_bounds() {
        let next = placed_frame(
            NSRect::new(NSPoint::new(100.0, 200.0), NSSize::new(0.0, 640.0)),
            PhysicalPosition::new(200, 400),
            PhysicalSize::new(0, 1280),
            PhysicalPosition::new(200, 400),
            PhysicalSize::new(640, 1280),
            2.0,
        );
        assert_eq!(next.size, NSSize::new(320.0, 640.0));
    }
}
