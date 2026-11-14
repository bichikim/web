//! Explicit interpolation policies; omitted fields preserve legacy document behavior.
use serde::Deserialize;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum NumberPrecision {
    Float32,
    Float64,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum MotionParameterBase {
    PreviousFrame,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum DrawOrderTieBreak {
    Parts,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum CoordinateSpace {
    Parent,
}

/// Warp cell interpolation (`interpolation` on a warp deformer).
#[derive(Debug, Clone, Copy, PartialEq, Eq, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum DeformerInterpolation {
    /// Each cell split into two triangles along one diagonal.
    Triangles,
    /// Each cell split along the other diagonal.
    TrianglesMirrored,
    /// Bilinear within each cell.
    Bilinear,
}

/// How inherited multiply and screen colors combine (`colorComposition`).
#[derive(Debug, Clone, Copy, PartialEq, Eq, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum ColorComposition {
    /// Cubism combines inherited multiply and screen colors independently.
    Cubism,
}

/// Rounding of draw orders before sorting (`drawOrderRounding`).
#[derive(Debug, Clone, Copy, PartialEq, Eq, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum DrawOrderRounding {
    /// Cubism's integer draw order: Float32 plus 0.001, then truncation.
    Cubism,
}

/// How glue that shares vertices composes (`glueComposition`).
#[derive(Debug, Clone, Copy, PartialEq, Eq, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum GlueComposition {
    /// Shared vertices are computed in glue order.
    Sequential,
}

/// What mesh validation checks (`mesh.validationSpace`).
#[derive(Debug, Clone, Copy, PartialEq, Eq, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum ValidationSpace {
    /// Index connectivity only: compiled meshes may overlap or collapse.
    Indices,
}

/// How a binding's influence curves combine (`influenceMode`).
#[derive(Debug, Clone, Copy, PartialEq, Eq, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum InfluenceMode {
    Minimum,
    Multiply,
}

/// Range of a binding's keyed property samples (`keyformRange`).
#[derive(Debug, Clone, Copy, PartialEq, Eq, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum KeyformRange {
    /// Additive samples may exceed display ranges; composed properties are still clamped.
    Unbounded,
}

/// Unit of `keyTolerance` (`sampling.keyToleranceUnit`).
#[derive(Debug, Clone, Copy, PartialEq, Eq, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum KeyToleranceUnit {
    /// Parameter units, as native Cubism snapping.
    Parameter,
    /// Normalized interval progress (the default).
    Progress,
}

/// Expression blending (`expression.composition`).
#[derive(Debug, Clone, Copy, PartialEq, Eq, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum ExpressionComposition {
    /// Cubism's sine fades and transition composition.
    Cubism,
}

/// A parameter interval a scene node is visible in (`parameterVisibility`).
#[derive(Debug, Clone, PartialEq, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ParameterVisibility {
    pub parameter_id: String,
    pub minimum: f64,
    pub maximum: f64,
    /// Input precision; Float64 when omitted.
    #[serde(default)]
    pub precision: Option<NumberPrecision>,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum BindingInterpolation {
    Grid,
}

/// Axis precision and snapping for grid keyforms, independent of their interpolation.
#[derive(Debug, Clone, Copy, PartialEq, Default, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct KeyformSampling {
    /// Float64 when omitted.
    #[serde(default)]
    pub continuous_precision: Option<NumberPrecision>,
    /// Float32 when omitted.
    #[serde(default)]
    pub discrete_precision: Option<NumberPrecision>,
    /// Endpoint tolerance; 0.0001 when omitted, 0 snaps only exact endpoints.
    #[serde(default)]
    pub key_tolerance: Option<f64>,
    /// Unit of `key_tolerance`; normalized progress when omitted.
    #[serde(default)]
    pub key_tolerance_unit: Option<KeyToleranceUnit>,
}
