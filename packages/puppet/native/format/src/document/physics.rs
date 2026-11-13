//! Pendulum chains (`document-physics.ts`), Cubism-style physics groups.

use serde::Deserialize;

/// Steps per second when `fps` is omitted.
pub const DEFAULT_CHAIN_FPS: f64 = 60.0;
/// Gravity direction when omitted: straight down (`y` points down).
pub const DEFAULT_CHAIN_GRAVITY: [f64; 2] = [0.0, 1.0];

/// Horizontal or vertical position, or tilt.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum PhysicsAxis {
    X,
    Y,
    Angle,
}

/// Maps a parameter's offset from its default onto `minimum..maximum` around `center`, each side
/// scaled separately.
#[derive(Debug, Clone, Copy, PartialEq, Deserialize)]
pub struct PhysicsRange {
    pub center: f64,
    pub maximum: f64,
    pub minimum: f64,
}

#[derive(Debug, Clone, Copy, PartialEq, Deserialize)]
pub struct PhysicsNormalization {
    pub angle: PhysicsRange,
    pub position: PhysicsRange,
}

/// A parameter moving or tilting a chain's root; inputs of one axis add up. A normalized value
/// moves the root toward `-x` unless `reflect` is set (Cubism's convention).
#[derive(Debug, Clone, PartialEq, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PhysicsInput {
    pub axis: PhysicsAxis,
    pub parameter_id: String,
    #[serde(default)]
    pub reflect: Option<bool>,
    pub weight: f64,
}

/// One pendulum, hanging from the previous one (the first from the root).
#[derive(Debug, Clone, Copy, PartialEq, Deserialize)]
pub struct ChainPendulum {
    /// Gravity's pull (Cubism's acceleration).
    pub acceleration: f64,
    /// Distance from the point it hangs from (Cubism's radius).
    pub length: f64,
    /// Share of velocity kept per step (Cubism's mobility).
    pub mobility: f64,
    /// Time scale per 1/30 s (Cubism's delay).
    pub reaction: f64,
}

/// A parameter driven by one pendulum: its angle in radians from the parent pendulum's direction
/// (gravity for the first), or its `x`/`y` offset from the parent, negated by `reflect`, times
/// `scale`, limited to the parameter range and blended by `weight`.
#[derive(Debug, Clone, PartialEq, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PhysicsOutput {
    pub axis: PhysicsAxis,
    pub parameter_id: String,
    pub pendulum_index: usize,
    #[serde(default)]
    pub reflect: Option<bool>,
    pub scale: f64,
    pub weight: f64,
}

#[derive(Debug, Clone, PartialEq, Deserialize)]
pub struct PhysicsChain {
    pub id: String,
    pub inputs: Vec<PhysicsInput>,
    pub normalization: PhysicsNormalization,
    pub outputs: Vec<PhysicsOutput>,
    pub pendulums: Vec<ChainPendulum>,
}
