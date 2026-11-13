//! Small 2D helpers.

use std::ops::{Add, Mul, Sub};

/// The same direction as `angle` in `-π..=π` (`atan2(sin, cos)`).
pub(crate) fn wrap_angle(angle: f64) -> f64 {
    angle.sin().atan2(angle.cos())
}

#[derive(Debug, Clone, Copy, PartialEq, Default, serde::Serialize, serde::Deserialize)]
pub struct Vec2 {
    pub x: f64,
    pub y: f64,
}

impl Vec2 {
    pub const ZERO: Self = Self { x: 0.0, y: 0.0 };

    pub const fn new(x: f64, y: f64) -> Self {
        Self { x, y }
    }

    pub fn length(self) -> f64 {
        self.x.hypot(self.y)
    }

    pub fn lerp(a: Self, b: Self, t: f64) -> Self {
        Self::new(a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t)
    }

    /// Turned counterclockwise (with `y` up) by `radians`.
    pub fn rotate(self, radians: f64) -> Self {
        let (sin, cos) = (radians.sin(), radians.cos());
        Self::new(self.x * cos - self.y * sin, self.x * sin + self.y * cos)
    }
}

impl From<[f64; 2]> for Vec2 {
    fn from([x, y]: [f64; 2]) -> Self {
        Self::new(x, y)
    }
}

impl Mul<f64> for Vec2 {
    type Output = Self;
    fn mul(self, factor: f64) -> Self {
        Self::new(self.x * factor, self.y * factor)
    }
}

impl Sub for Vec2 {
    type Output = Self;
    fn sub(self, other: Self) -> Self {
        Self::new(self.x - other.x, self.y - other.y)
    }
}

impl Add for Vec2 {
    type Output = Self;
    fn add(self, other: Self) -> Self {
        Self::new(self.x + other.x, self.y + other.y)
    }
}
