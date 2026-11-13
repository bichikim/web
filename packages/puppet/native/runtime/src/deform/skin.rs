//! Rotation skinning (`skinning.ts`, `rigid-blend.ts`).

use poffo_format::document::SkinMatrix;

use crate::geometry::Vec2;

/// 2D affine matrix: `x' = xx·x + xy·y + x`, `y' = yx·x + yy·y + y`.
#[derive(Debug, Clone, Copy, PartialEq)]
pub(crate) struct Matrix {
    pub(crate) xx: f64,
    pub(crate) yx: f64,
    pub(crate) xy: f64,
    pub(crate) yy: f64,
    pub(crate) x: f64,
    pub(crate) y: f64,
}

impl Matrix {
    pub(crate) const IDENTITY: Self = Self {
        xx: 1.0,
        yx: 0.0,
        xy: 0.0,
        yy: 1.0,
        x: 0.0,
        y: 0.0,
    };

    pub(crate) fn transform(&self, p: Vec2) -> Vec2 {
        Vec2::new(
            self.xx * p.x + self.xy * p.y + self.x,
            self.yx * p.x + self.yy * p.y + self.y,
        )
    }

    /// `multiplySkinMatrices(self, child)`: applies `child` first.
    pub(crate) fn multiply(&self, child: &Self) -> Self {
        let t = self.transform(Vec2::new(child.x, child.y));
        Self {
            xx: self.xx * child.xx + self.xy * child.yx,
            xy: self.xx * child.xy + self.xy * child.yy,
            yx: self.yx * child.xx + self.yy * child.yx,
            yy: self.yx * child.xy + self.yy * child.yy,
            x: t.x,
            y: t.y,
        }
    }
}

impl From<SkinMatrix> for Matrix {
    fn from(m: SkinMatrix) -> Self {
        Self {
            xx: m.xx,
            yx: m.yx,
            xy: m.xy,
            yy: m.yy,
            x: m.x,
            y: m.y,
        }
    }
}

/// Blends planar rigid transforms with normalized dual quaternions (`blendRigidTransforms`).
pub(crate) fn blend_rigid(transforms: &[(Matrix, f64)]) -> Option<Matrix> {
    let reference = transforms.iter().fold(None::<&(Matrix, f64)>, |best, t| {
        if best.is_none_or(|b| t.1 > b.1) {
            Some(t)
        } else {
            best
        }
    })?;
    if reference.1 <= 0.0 {
        return None;
    }
    if transforms.len() == 1 {
        return Some(reference.0);
    }
    let reference_angle = reference.0.yx.atan2(reference.0.xx) / 2.0;
    let (reference_imaginary, reference_real) = reference_angle.sin_cos();
    let (mut real, mut imaginary, mut dual_x, mut dual_y) = (0.0, 0.0, 0.0, 0.0);
    for (matrix, weight) in transforms {
        let angle = matrix.yx.atan2(matrix.xx) / 2.0;
        let (sine, cosine) = angle.sin_cos();
        let aligned = if cosine * reference_real + sine * reference_imaginary < 0.0 {
            -weight
        } else {
            *weight
        };
        real += cosine * aligned;
        imaginary += sine * aligned;
        dual_x += (matrix.x * cosine + matrix.y * sine) * aligned / 2.0;
        dual_y += (matrix.y * cosine - matrix.x * sine) * aligned / 2.0;
    }
    let length = real.hypot(imaginary);
    let (real, imaginary, dual_x, dual_y) = (
        real / length,
        imaginary / length,
        dual_x / length,
        dual_y / length,
    );
    let cosine = real * real - imaginary * imaginary;
    let sine = 2.0 * real * imaginary;
    Some(Matrix {
        x: 2.0 * (dual_x * real - dual_y * imaginary),
        xx: cosine,
        xy: -sine,
        y: 2.0 * (dual_x * imaginary + dual_y * real),
        yx: sine,
        yy: cosine,
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    fn rotation(angle: f64, x: f64, y: f64) -> Matrix {
        let (s, c) = angle.sin_cos();
        Matrix {
            xx: c,
            yx: s,
            xy: -s,
            yy: c,
            x,
            y,
        }
    }

    #[test]
    fn single_and_equal_blends_keep_rigidity() {
        let a = rotation(0.3, 1.0, 2.0);
        assert_eq!(blend_rigid(&[(a, 1.0)]), Some(a));
        let blended = blend_rigid(&[(a, 0.5), (a, 0.5)]).expect("blend");
        assert!((blended.xx - a.xx).abs() < 1e-12 && (blended.x - a.x).abs() < 1e-12);
        assert_eq!(blend_rigid(&[]), None);
        let half = blend_rigid(&[
            (rotation(0.0, 0.0, 0.0), 1.0),
            (rotation(1.0, 0.0, 0.0), 1.0),
        ])
        .expect("blend");
        assert!((half.yx.atan2(half.xx) - 0.5).abs() < 1e-12);
    }
}
