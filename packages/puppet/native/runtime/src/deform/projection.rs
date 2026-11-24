//! Leaf operations deferred to the geometry device; CPU correction retains f64 operation order.
use crate::geometry::Vec2;

#[derive(Clone)]
pub(crate) struct Projection {
    pub(crate) kind: u32,
    pub(crate) values: Vec<f64>,
}
impl Projection {
    pub(crate) fn accepts(&self, points: &[f32]) -> bool {
        let bounded = |v: f64| {
            v.is_finite() && (v == 0.0 || (2_f64.powi(-60)..=2_f64.powi(30)).contains(&v.abs()))
        };
        self.values.iter().copied().all(bounded)
            && points.iter().all(|&v| bounded(f64::from(v)))
            && (self.kind == 1
                || points.chunks_exact(2).all(|p| {
                    let v = &self.values;
                    (v[0]..=v[0] + v[2]).contains(&f64::from(p[0]))
                        && (v[1]..=v[1] + v[3]).contains(&f64::from(p[1]))
                }))
    }
    /// Collapse two affine rotations for device evaluation. The original sequence remains
    /// available for corrections; the error envelope covers coefficient and f64 rounding.
    pub(crate) fn packet(&self) -> (u32, Vec<f64>) {
        if self.kind != 1 {
            return (self.kind, self.values.clone());
        }
        let v = &self.values;
        let bx = v[4] * v[6];
        let by = -v[5] * v[7];
        let cx = v[5] * v[6];
        let cy = v[4] * v[7];
        let ox = v[2] - v[0] * bx - v[1] * by - v[8];
        let oy = v[3] - v[0] * cx - v[1] * cy - v[9];
        let amplification = (v[6].abs() + v[7].abs()).max(1.)
            * (v[4].abs() + v[5].abs()).max(1.)
            * (v[12].abs() + v[13].abs()).max(1.);
        let offsets = v[..4].iter().chain(&v[8..12]).map(|v| v.abs()).sum::<f64>();
        let rounding = amplification * 2_f64.powi(-43);
        (
            5,
            vec![
                v[12] * bx - v[13] * cx,
                v[12] * by - v[13] * cy,
                v[10] + ox * v[12] - oy * v[13],
                v[13] * bx + v[12] * cx,
                v[13] * by + v[12] * cy,
                v[11] + ox * v[13] + oy * v[12],
                offsets * rounding,
                rounding,
            ],
        )
    }
    pub(crate) fn evaluate(&self, point: Vec2) -> Vec2 {
        let v = &self.values;
        if self.kind == 1 {
            let x = (point.x - v[0]) * v[6];
            let y = (point.y - v[1]) * v[7];
            let moved = Vec2::new(v[2] + x * v[4] - y * v[5], v[3] + x * v[5] + y * v[4]);
            let mapped = Vec2::lerp(point, Vec2::lerp(point, moved, 1.0), 1.0);
            let local = mapped - Vec2::new(v[8], v[9]);
            return Vec2::new(
                v[10] + local.x * v[12] - local.y * v[13],
                v[11] + local.x * v[13] + local.y * v[12],
            );
        }
        let x = (point.x - v[0]) / v[2];
        let y = (point.y - v[1]) / v[3];
        let sample = |axis: usize| {
            let [a, b, c, d] = [v[4 + axis], v[6 + axis], v[8 + axis], v[10 + axis]];
            match self.kind {
                2 => a * (1.0 - x) * (1.0 - y) + b * x * (1.0 - y) + c * (1.0 - x) * y + d * x * y,
                3 if x + y <= 1.0 => a + (b - a) * x + (c - a) * y,
                3 => d + (c - d) * (1.0 - x) + (b - d) * (1.0 - y),
                _ if x >= y => a + (b - a) * x + (d - b) * y,
                _ => a + (d - c) * x + (c - a) * y,
            }
        };
        Vec2::lerp(point, Vec2::new(sample(0), sample(1)), 1.0)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn rejects_unrepresentable_values_and_outside_grid_vertices() {
        let grid = Projection {
            kind: 2,
            values: vec![0., 0., 1., 1., 0., 0., 1., 0., 0., 1., 1., 1.],
        };
        assert!(grid.accepts(&[0.2, 0.8, 1., 0.]));
        assert!(!grid.accepts(&[-0.1, 0.8]));
        assert!(!grid.accepts(&[f32::INFINITY, 0.]));
    }
    #[test]
    fn affine_envelope_contains_original_rounding_under_cancellation_and_scale() {
        for exponent in [-30, -10, 0, 10, 30] {
            for angle in [0.001_f64, 0.7, 2.1] {
                let scale = 2_f64.powi(exponent);
                let operation = Projection {
                    kind: 1,
                    values: vec![
                        700.123 * scale,
                        -300.234 * scale,
                        123.456 * scale,
                        456.789 * scale,
                        angle.cos(),
                        angle.sin(),
                        -1.,
                        1.,
                        200.345 * scale,
                        -500.456 * scale,
                        600.567 * scale,
                        400.678 * scale,
                        angle.cos() * scale,
                        angle.sin() * scale,
                    ],
                };
                let (kind, packet) = operation.packet();
                assert_eq!(kind, 5);
                for value in [-1000., -0.001, 0., 700.123, 999.] {
                    let point = Vec2::new(value * scale, (value + 0.5) * scale);
                    let expected = operation.evaluate(point);
                    let actual = Vec2::new(
                        packet[0] * point.x + packet[1] * point.y + packet[2],
                        packet[3] * point.x + packet[4] * point.y + packet[5],
                    );
                    let envelope = packet[6] + (point.x.abs() + point.y.abs()) * packet[7];
                    assert!((actual.x - expected.x).abs() <= envelope);
                    assert!((actual.y - expected.y).abs() <= envelope);
                }
            }
        }
    }
    #[test]
    fn preserves_non_affine_bilinear_and_both_triangle_diagonals() {
        let mut grid = Projection {
            kind: 2,
            values: vec![0., 0., 1., 1., 0., 0., 1., 0., 0., 1., 2., 3.],
        };
        assert_eq!(grid.evaluate(Vec2::new(0.25, 0.5)), Vec2::new(0.375, 0.75));
        grid.kind = 3;
        assert_eq!(grid.evaluate(Vec2::new(0.25, 0.5)), Vec2::new(0.25, 0.5));
        grid.kind = 4;
        assert_eq!(grid.evaluate(Vec2::new(0.25, 0.5)), Vec2::new(0.5, 1.));
    }
}
