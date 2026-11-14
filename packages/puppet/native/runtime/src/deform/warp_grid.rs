//! Piecewise warp surface (triangles, mirrored triangles or bilinear cells) with Cubism's virtual
//! outer grid (`sample-warp-grid.ts`).
use super::Layout;
use crate::geometry::Vec2;
use poffo_format::document::DeformerInterpolation;

/// How far the virtual outer grid extends past each edge, in grid widths.
const EXTENSION: f64 = 2.0;

/// The cell edges around `value` (normalized grid progress) and the progress inside the cell.
fn interval(value: f64, divisions: u32) -> (f64, f64, f64) {
    if value < 0.0 {
        return (-EXTENSION, 0.0, (value + EXTENSION) / EXTENSION);
    }
    if value > 1.0 {
        return (1.0, 1.0 + EXTENSION, (value - 1.0) / EXTENSION);
    }
    let index = (value * f64::from(divisions))
        .floor()
        .min(f64::from(divisions) - 1.0);
    (
        index / f64::from(divisions),
        (index + 1.0) / f64::from(divisions),
        value * f64::from(divisions) - index,
    )
}

/// One coordinate inside a cell from its corners and the in-cell progress `(x, y)`.
fn interpolate(
    interpolation: DeformerInterpolation,
    [top_left, top_right, bottom_left, bottom_right]: [f64; 4],
    x: f64,
    y: f64,
) -> f64 {
    match interpolation {
        DeformerInterpolation::Bilinear => {
            top_left * (1.0 - x) * (1.0 - y)
                + top_right * x * (1.0 - y)
                + bottom_left * (1.0 - x) * y
                + bottom_right * x * y
        }
        // Split along the top-left to bottom-right diagonal.
        DeformerInterpolation::TrianglesMirrored => {
            if x >= y {
                top_left + (top_right - top_left) * x + (bottom_right - top_right) * y
            } else {
                top_left + (bottom_right - bottom_left) * x + (bottom_left - top_left) * y
            }
        }
        // Split along the top-right to bottom-left diagonal.
        DeformerInterpolation::Triangles => {
            if x + y <= 1.0 {
                top_left + (top_right - top_left) * x + (bottom_left - top_left) * y
            } else {
                bottom_right
                    + (bottom_left - bottom_right) * (1.0 - x)
                    + (top_right - bottom_right) * (1.0 - y)
            }
        }
    }
}

/// `sampleWarpGrid`; callers ensure the layout has an interpolation.
pub(super) fn sample(
    layout: &Layout<'_>,
    point: Vec2,
    interpolation: DeformerInterpolation,
) -> Vec2 {
    sample_coordinates(layout.shape, point, interpolation, |index| {
        layout.control_points.get(index).copied().unwrap_or(0.0)
    })
}

pub(super) fn sample_coordinates(
    shape: &poffo_format::document::DeformerShape,
    point: Vec2,
    interpolation: DeformerInterpolation,
    at: impl Fn(usize) -> f64,
) -> Vec2 {
    let (left, right, x) = interval(
        (point.x - shape.bounds.x) / shape.bounds.width,
        shape.columns,
    );
    let (top, bottom, y) = interval((point.y - shape.bounds.y) / shape.bounds.height, shape.rows);
    let columns = shape.columns as usize;
    let rows = shape.rows as usize;
    let coordinate = |x: f64, y: f64, axis: usize| {
        if (0.0..=1.0).contains(&x) && (0.0..=1.0).contains(&y) {
            return at(((y * rows as f64).round() as usize * (columns + 1)
                + (x * columns as f64).round() as usize)
                * 2
                + axis);
        }
        // Outside the grid: the plane through the four corners' average and edge slopes.
        let a = at(axis);
        let b = at(columns * 2 + axis);
        let c = at(rows * (columns + 1) * 2 + axis);
        let d = at(((rows + 1) * (columns + 1) - 1) * 2 + axis);
        (a + b + c + d) / 4.0
            + (x - 0.5) * (b + d - a - c) / 2.0
            + (y - 0.5) * (c + d - a - b) / 2.0
    };
    let axis = |axis: usize| {
        let corners = [
            coordinate(left, top, axis),
            coordinate(right, top, axis),
            coordinate(left, bottom, axis),
            coordinate(right, bottom, axis),
        ];
        interpolate(interpolation, corners, x, y)
    };
    Vec2::new(axis(0), axis(1))
}

#[cfg(test)]
mod tests {
    use super::*;

    const CORNERS: [f64; 4] = [0.0, 1.0, 2.0, 7.0];

    #[test]
    fn bilinear_blends_all_four_corners() {
        let value = interpolate(DeformerInterpolation::Bilinear, CORNERS, 0.5, 0.5);
        assert!((value - 2.5).abs() < 1e-12);
    }

    #[test]
    fn triangle_splits_use_opposite_diagonals() {
        // Below the main diagonal, mirrored triangles use the top-left, top-right and
        // bottom-right corners; plain triangles use the top-left, top-right and bottom-left.
        let mirrored = interpolate(
            DeformerInterpolation::TrianglesMirrored,
            CORNERS,
            0.75,
            0.25,
        );
        assert!((mirrored - (0.75 + 6.0 * 0.25)).abs() < 1e-12);
        let plain = interpolate(DeformerInterpolation::Triangles, CORNERS, 0.75, 0.25);
        assert!((plain - (0.75 + 2.0 * 0.25)).abs() < 1e-12);
    }
}
