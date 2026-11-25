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

/// Scalar reference for the paired coordinate calculations.
#[cfg(test)]
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

/// Evaluate both coordinates through one cell and diagonal selection.
/// Resolve only the corners that contribute to the sample, as each read can reach a parent.
#[cfg(not(all(target_arch = "wasm32", target_feature = "simd128")))]
#[inline(always)]
fn interpolate_points(
    interpolation: DeformerInterpolation,
    x: f64,
    y: f64,
    at: impl Fn(usize) -> Vec2,
) -> Vec2 {
    match interpolation {
        DeformerInterpolation::Bilinear => {
            let [a, b, c, d] = [at(0), at(1), at(2), at(3)];
            a * (1.0 - x) * (1.0 - y) + b * x * (1.0 - y) + c * (1.0 - x) * y + d * x * y
        }
        DeformerInterpolation::Triangles if x + y <= 1.0 => {
            let [a, b, c] = [at(0), at(1), at(2)];
            a + (b - a) * x + (c - a) * y
        }
        DeformerInterpolation::Triangles => {
            let [b, c, d] = [at(1), at(2), at(3)];
            d + (c - d) * (1.0 - x) + (b - d) * (1.0 - y)
        }
        DeformerInterpolation::TrianglesMirrored if x >= y => {
            let [a, b, d] = [at(0), at(1), at(3)];
            a + (b - a) * x + (d - b) * y
        }
        DeformerInterpolation::TrianglesMirrored => {
            let [a, c, d] = [at(0), at(2), at(3)];
            a + (d - c) * x + (c - a) * y
        }
    }
}

/// One f64 lane per axis, preserving the scalar evaluation order and corner selection.
#[cfg(all(target_arch = "wasm32", target_feature = "simd128"))]
#[inline(always)]
fn interpolate_points(
    interpolation: DeformerInterpolation,
    x: f64,
    y: f64,
    at: impl Fn(usize) -> Vec2,
) -> Vec2 {
    use core::arch::wasm32::{
        f64x2, f64x2_add, f64x2_extract_lane, f64x2_mul, f64x2_splat, f64x2_sub,
    };

    let load = |corner| {
        let v = at(corner);
        f64x2(v.x, v.y)
    };
    let scale = |value, factor| f64x2_mul(value, f64x2_splat(factor));
    let sum = |anchor, first, second| f64x2_add(f64x2_add(anchor, first), second);
    let sampled = match interpolation {
        DeformerInterpolation::Bilinear => {
            let [a, b, c, d] = [load(0), load(1), load(2), load(3)];
            let left = 1.0 - x;
            let top = 1.0 - y;
            let first = f64x2_add(scale(scale(a, left), top), scale(scale(b, x), top));
            sum(first, scale(scale(c, left), y), scale(scale(d, x), y))
        }
        DeformerInterpolation::Triangles if x + y <= 1.0 => {
            let [a, b, c] = [load(0), load(1), load(2)];
            sum(a, scale(f64x2_sub(b, a), x), scale(f64x2_sub(c, a), y))
        }
        DeformerInterpolation::Triangles => {
            let [b, c, d] = [load(1), load(2), load(3)];
            sum(
                d,
                scale(f64x2_sub(c, d), 1.0 - x),
                scale(f64x2_sub(b, d), 1.0 - y),
            )
        }
        DeformerInterpolation::TrianglesMirrored if x >= y => {
            let [a, b, d] = [load(0), load(1), load(3)];
            sum(a, scale(f64x2_sub(b, a), x), scale(f64x2_sub(d, b), y))
        }
        DeformerInterpolation::TrianglesMirrored => {
            let [a, c, d] = [load(0), load(2), load(3)];
            sum(a, scale(f64x2_sub(d, c), x), scale(f64x2_sub(c, a), y))
        }
    };
    Vec2::new(
        f64x2_extract_lane::<0>(sampled),
        f64x2_extract_lane::<1>(sampled),
    )
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

/// Sample each needed corner once, retaining the scalar operation order within each axis.
pub(super) fn sample_points(
    shape: &poffo_format::document::DeformerShape,
    point: Vec2,
    interpolation: DeformerInterpolation,
    at: impl Fn(usize) -> Vec2,
) -> Vec2 {
    let horizontal = (point.x - shape.bounds.x) / shape.bounds.width;
    let vertical = (point.y - shape.bounds.y) / shape.bounds.height;
    let columns = shape.columns as usize;
    let rows = shape.rows as usize;
    if columns > 0
        && rows > 0
        && (0.0..=1.0).contains(&horizontal)
        && (0.0..=1.0).contains(&vertical)
    {
        // Keep integer cell identities instead of dividing grid indices into normalized
        // corner coordinates and multiplying/rounding them back into the same indices.
        let column_position = horizontal * f64::from(shape.columns);
        let row_position = vertical * f64::from(shape.rows);
        let column = column_position.floor().min(f64::from(shape.columns) - 1.0);
        let row = row_position.floor().min(f64::from(shape.rows) - 1.0);
        let first = row as usize * (columns + 1) + column as usize;
        let x = column_position - column;
        let y = row_position - row;
        let indices = [first, first + 1, first + columns + 1, first + columns + 2];
        return interpolate_points(interpolation, x, y, |corner| at(indices[corner]));
    }
    let (left, right, x) = interval(horizontal, shape.columns);
    let (top, bottom, y) = interval(vertical, shape.rows);
    let indices = [
        0,
        columns,
        rows * (columns + 1),
        (rows + 1) * (columns + 1) - 1,
    ];
    // Every fallback cell contains an exterior corner. All exterior values use these
    // same four source points; retain them once for both axes and every virtual corner.
    let outer = [
        at(indices[0]),
        at(indices[1]),
        at(indices[2]),
        at(indices[3]),
    ];
    let corner = |x: f64, y: f64| {
        if (0.0..=1.0).contains(&x) && (0.0..=1.0).contains(&y) {
            let index = (y * rows as f64).round() as usize * (columns + 1)
                + (x * columns as f64).round() as usize;
            return indices
                .iter()
                .position(|&source| source == index)
                .map_or_else(|| at(index), |source| outer[source]);
        }
        let [a, b, c, d] = outer;
        let axis = |a: f64, b: f64, c: f64, d: f64| {
            (a + b + c + d) / 4.0
                + (x - 0.5) * (b + d - a - c) / 2.0
                + (y - 0.5) * (c + d - a - b) / 2.0
        };
        Vec2::new(axis(a.x, b.x, c.x, d.x), axis(a.y, b.y, c.y, d.y))
    };
    interpolate_points(interpolation, x, y, |index| {
        let (x, y) = [(left, top), (right, top), (left, bottom), (right, bottom)][index];
        corner(x, y)
    })
}

pub(super) fn sample_coordinates(
    shape: &poffo_format::document::DeformerShape,
    point: Vec2,
    interpolation: DeformerInterpolation,
    at: impl Fn(usize) -> f64,
) -> Vec2 {
    sample_points(shape, point, interpolation, |index| {
        Vec2::new(at(index * 2), at(index * 2 + 1))
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn triangular_cells_sample_only_the_three_used_corners() {
        let shape = serde_json::from_value(serde_json::json!({
            "bounds":{"x":0,"y":0,"width":1,"height":1},
            "columns":2,"rows":2,"controlPoints":(0..18).map(|i|i as f64*0.13).collect::<Vec<_>>()
        }))
        .unwrap();
        for interpolation in [
            DeformerInterpolation::Triangles,
            DeformerInterpolation::TrianglesMirrored,
        ] {
            for point in [Vec2::new(0.1, 0.2), Vec2::new(0.4, 0.3)] {
                let calls = std::cell::Cell::new(0);
                let actual = sample_points(&shape, point, interpolation, |index| {
                    calls.set(calls.get() + 1);
                    Vec2::new(
                        shape.control_points[index * 2],
                        shape.control_points[index * 2 + 1],
                    )
                });
                let expected = reference_sample(&shape, point, interpolation, |index| {
                    shape.control_points[index]
                });
                assert_eq!(
                    [actual.x.to_bits(), actual.y.to_bits()],
                    [expected.x.to_bits(), expected.y.to_bits()]
                );
                assert_eq!(calls.get(), 3);
            }
        }
    }

    #[test]
    fn outer_grid_reuses_its_four_source_corners_for_virtual_cells() {
        let shape = serde_json::from_value(serde_json::json!({
            "bounds":{"x":0,"y":0,"width":1,"height":1},
            "columns":2,"rows":2,"controlPoints":(0..18).map(|i|i as f64*0.13).collect::<Vec<_>>()
        }))
        .unwrap();
        let point = Vec2::new(-0.3, -0.4);
        for interpolation in [
            DeformerInterpolation::Bilinear,
            DeformerInterpolation::Triangles,
            DeformerInterpolation::TrianglesMirrored,
        ] {
            let calls = std::cell::Cell::new(0);
            let actual = sample_points(&shape, point, interpolation, |index| {
                calls.set(calls.get() + 1);
                Vec2::new(
                    shape.control_points[index * 2],
                    shape.control_points[index * 2 + 1],
                )
            });
            let expected = reference_sample(&shape, point, interpolation, |index| {
                shape.control_points[index]
            });
            assert_eq!(
                [actual.x.to_bits(), actual.y.to_bits()],
                [expected.x.to_bits(), expected.y.to_bits()]
            );
            assert_eq!(calls.get(), 4);
        }
    }

    fn reference_sample(
        shape: &poffo_format::document::DeformerShape,
        point: Vec2,
        interpolation: DeformerInterpolation,
        at: impl Fn(usize) -> f64,
    ) -> Vec2 {
        let (left, right, x) = interval(
            (point.x - shape.bounds.x) / shape.bounds.width,
            shape.columns,
        );
        let (top, bottom, y) =
            interval((point.y - shape.bounds.y) / shape.bounds.height, shape.rows);
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

    const CORNERS: [f64; 4] = [0.0, 1.0, 2.0, 7.0];

    #[test]
    fn paired_corner_sampling_keeps_every_scalar_bit_at_grid_edges_and_outside() {
        let shape: poffo_format::document::DeformerShape = serde_json::from_value(serde_json::json!({"bounds":{"x":0,"y":0,"width":1,"height":1},"columns":3,"rows":2,"controlPoints":(0..24).map(|i| f64::from(i)*0.13).collect::<Vec<_>>()})).unwrap();
        for interpolation in [
            DeformerInterpolation::Bilinear,
            DeformerInterpolation::Triangles,
            DeformerInterpolation::TrianglesMirrored,
        ] {
            for x in [-2.3, -0.0, 0.13, 0.5, 1.0, 1.9] {
                for y in [-1.7, 0.0, 0.25, 0.79, 1.0, 2.1] {
                    let at = |i| shape.control_points[i];
                    let point = Vec2::new(x, y);
                    let expected = reference_sample(&shape, point, interpolation, at);
                    let actual = sample_coordinates(&shape, point, interpolation, at);
                    assert_eq!(
                        [actual.x.to_bits(), actual.y.to_bits()],
                        [expected.x.to_bits(), expected.y.to_bits()]
                    );
                }
            }
        }
        let calls = std::cell::Cell::new(0);
        sample_points(
            &shape,
            Vec2::new(0.13, 0.25),
            DeformerInterpolation::Bilinear,
            |i| {
                calls.set(calls.get() + 1);
                Vec2::new(shape.control_points[i * 2], shape.control_points[i * 2 + 1])
            },
        );
        assert_eq!(calls.get(), 4);
    }

    #[test]
    fn direct_cell_sampling_keeps_scalar_bits_across_grid_sizes_and_boundaries() {
        for (columns, rows) in [(1, 1), (2, 3), (7, 5), (31, 17), (0, 2), (2, 0)] {
            let mut shape: poffo_format::document::DeformerShape =
                serde_json::from_value(serde_json::json!({
                    "bounds":{"x":-0.37,"y":1.23,"width":1.79,"height":0.63},
                    "columns":columns,"rows":rows,
                    "controlPoints":(0..(columns+1)*(rows+1)*2)
                        .map(|i| (f64::from(i)*0.173).sin()).collect::<Vec<_>>()
                }))
                .unwrap();
            let xs: Vec<_> = (0..=columns.max(1))
                .flat_map(|i| {
                    let value = f64::from(i) / f64::from(columns.max(1));
                    [value - f64::EPSILON, value, value + f64::EPSILON]
                })
                .chain([-2.0, -0.0, 0.139, 1.87])
                .collect();
            let ys: Vec<_> = (0..=rows.max(1))
                .flat_map(|i| {
                    let value = f64::from(i) / f64::from(rows.max(1));
                    [value - f64::EPSILON, value, value + f64::EPSILON]
                })
                .chain([-1.9, 0.271, 2.0])
                .collect();
            for width in [1.79, -1.79, 0.0] {
                shape.bounds.width = width;
                for interpolation in [
                    DeformerInterpolation::Bilinear,
                    DeformerInterpolation::Triangles,
                    DeformerInterpolation::TrianglesMirrored,
                ] {
                    for &x in &xs {
                        for &y in &ys {
                            let point = Vec2::new(
                                shape.bounds.x + x * width,
                                shape.bounds.y + y * shape.bounds.height,
                            );
                            let at = |i| shape.control_points[i];
                            let expected = reference_sample(&shape, point, interpolation, at);
                            let actual = sample_coordinates(&shape, point, interpolation, at);
                            for (a, b) in [(actual.x, expected.x), (actual.y, expected.y)] {
                                assert!(
                                    a.to_bits() == b.to_bits() || (a.is_nan() && b.is_nan()),
                                    "{columns}/{rows} {width} {x}/{y}: {a:?} != {b:?}"
                                );
                            }
                        }
                    }
                }
            }
        }
    }

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
