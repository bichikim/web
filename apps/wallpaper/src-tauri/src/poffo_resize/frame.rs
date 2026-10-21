use super::Direction;
use objc2_foundation::{NSPoint, NSRect, NSSize};

pub(super) fn resize_frame(
    original: NSRect,
    direction: Direction,
    delta: NSPoint,
    minimum: NSSize,
    maximum: NSSize,
) -> NSRect {
    let (horizontal, vertical) = match direction {
        Direction::East => (1.0, 0.0),
        Direction::North => (0.0, 1.0),
        Direction::NorthEast => (1.0, 1.0),
        Direction::NorthWest => (-1.0, 1.0),
        Direction::South => (0.0, -1.0),
        Direction::SouthEast => (1.0, -1.0),
        Direction::SouthWest => (-1.0, -1.0),
        Direction::West => (-1.0, 0.0),
    };
    let width = (original.size.width + horizontal * delta.x).clamp(minimum.width, maximum.width);
    let height = (original.size.height + vertical * delta.y).clamp(minimum.height, maximum.height);
    NSRect::new(
        NSPoint::new(
            if horizontal < 0.0 {
                original.origin.x + original.size.width - width
            } else {
                original.origin.x
            },
            if vertical < 0.0 {
                original.origin.y + original.size.height - height
            } else {
                original.origin.y
            },
        ),
        NSSize::new(width, height),
    )
}

#[cfg(test)]
mod tests {
    use super::*;

    fn frame(direction: Direction, delta: NSPoint) -> NSRect {
        resize_frame(
            NSRect::new(NSPoint::new(100.0, 200.0), NSSize::new(300.0, 400.0)),
            direction,
            delta,
            NSSize::new(160.0, 210.0),
            NSSize::new(4096.0, 4096.0),
        )
    }

    #[test]
    fn each_handle_moves_only_its_edges_and_keeps_the_opposite_edges_fixed() {
        let cases = [
            (Direction::East, (100.0, 200.0, 340.0, 400.0)),
            (Direction::North, (100.0, 200.0, 300.0, 430.0)),
            (Direction::NorthEast, (100.0, 200.0, 340.0, 430.0)),
            (Direction::NorthWest, (140.0, 200.0, 260.0, 430.0)),
            (Direction::South, (100.0, 230.0, 300.0, 370.0)),
            (Direction::SouthEast, (100.0, 230.0, 340.0, 370.0)),
            (Direction::SouthWest, (140.0, 230.0, 260.0, 370.0)),
            (Direction::West, (140.0, 200.0, 260.0, 400.0)),
        ];
        for (direction, (x, y, width, height)) in cases {
            assert_eq!(
                frame(direction, NSPoint::new(40.0, 30.0)),
                NSRect::new(NSPoint::new(x, y), NSSize::new(width, height))
            );
        }
    }

    #[test]
    fn minimum_size_preserves_the_opposite_corner() {
        assert_eq!(
            frame(Direction::SouthWest, NSPoint::new(1000.0, 1000.0)),
            NSRect::new(NSPoint::new(240.0, 390.0), NSSize::new(160.0, 210.0))
        );
    }

    #[test]
    fn maximum_size_preserves_the_opposite_corner() {
        assert_eq!(
            frame(Direction::NorthWest, NSPoint::new(-10000.0, 10000.0)),
            NSRect::new(NSPoint::new(-3696.0, 200.0), NSSize::new(4096.0, 4096.0))
        );
    }
}
