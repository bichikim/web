//! Model metadata (`document-model.ts`): parameter roles, display groups and default framing.

use serde::Deserialize;

/// Parameters driven by automatic effects (Cubism's model3 `Groups`).
#[derive(Debug, Clone, PartialEq, Eq, Default, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ParameterRoles {
    /// Set by eye openness: 1 is the default, 0 the range end farther from it.
    #[serde(default)]
    pub eye_blink: Vec<String>,
    /// Receive the lip-sync mouth level.
    #[serde(default)]
    pub lip_sync: Vec<String>,
}

/// A folder of parameters for display (Cubism's cdi3 parameter groups); may nest.
#[derive(Debug, Clone, PartialEq, Eq, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ParameterGroup {
    /// Parent group.
    #[serde(default)]
    pub group_id: Option<String>,
    pub id: String,
    pub name: String,
}

/// The part of the document players show by default (Cubism's model3 `Layout`): this rectangle,
/// in document coordinates, is fitted into the screen instead of the whole viewport.
#[derive(Debug, Clone, Copy, PartialEq, Deserialize)]
pub struct Layout {
    pub x: f64,
    pub y: f64,
    pub width: f64,
    pub height: f64,
    /// Where the rectangle sits when the screen's aspect ratio differs, per axis from 0 (left or
    /// top) to 1 (right or bottom); centered when omitted.
    #[serde(default)]
    pub align: Option<[f64; 2]>,
}

impl Layout {
    pub const CENTER: [f64; 2] = [0.5, 0.5];
}

/// One value per mouth-shape parameter for each vowel, in `MouthShapes::parameter_ids` order.
#[derive(Debug, Clone, PartialEq, Deserialize)]
pub struct VowelValues {
    pub a: Vec<f64>,
    pub i: Vec<f64>,
    pub u: Vec<f64>,
    pub e: Vec<f64>,
    pub o: Vec<f64>,
}

impl VowelValues {
    /// In `a`, `i`, `u`, `e`, `o` order.
    pub fn all(&self) -> [&[f64]; 5] {
        [&self.a, &self.i, &self.u, &self.e, &self.o]
    }
}

/// Mouth shapes per vowel for lip sync from audio (Cubism's motionsync3 mappings). Vowel weights
/// blend each vowel's values into the listed parameters over their current values:
/// `value · (1 − Σ w) + Σ w · shape`.
/// Automatic breathing on one parameter (Cubism's Breath): each frame adds
/// `(offset + peak · sin(2π · t / period)) · weight` after motions and before physics, `t` being
/// seconds since breathing started (`PuppetBreathParameter`).
#[derive(Debug, Clone, PartialEq, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BreathParameter {
    pub parameter_id: String,
    pub offset: f64,
    pub peak: f64,
    /// Seconds per breath; positive.
    pub period: f64,
    pub weight: f64,
}

/// One parameter that follows the look point `(X, Y)` (`-1..=1`, x right, y up; Cubism's Look):
/// each frame adds `x · X + y · Y + xy · X · Y` after motions and before breathing
/// (`PuppetLookParameter`).
#[derive(Debug, Clone, PartialEq, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LookParameter {
    pub parameter_id: String,
    pub x: f64,
    pub y: f64,
    pub xy: f64,
}

#[derive(Debug, Clone, PartialEq, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MouthShapes {
    pub parameter_ids: Vec<String>,
    /// Seconds for the shown weights to follow new analysis results; 0.06 when omitted.
    #[serde(default)]
    pub smoothing: Option<f64>,
    pub vowels: VowelValues,
}

impl MouthShapes {
    pub const DEFAULT_SMOOTHING: f64 = 0.06;
}
