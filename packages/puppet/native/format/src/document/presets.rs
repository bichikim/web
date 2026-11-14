//! Expression presets, pose groups and hit areas (`document.ts`).

use serde::Deserialize;

/// Seconds, matching the Cubism expression default.
pub const DEFAULT_EXPRESSION_FADE_TIME: f64 = 1.0;
/// Seconds, matching the Cubism pose default.
pub const DEFAULT_POSE_FADE_TIME: f64 = 0.5;

/// How an expression value combines with the motion-mixed parameter value.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum ExpressionBlend {
    Add,
    Multiply,
    Overwrite,
}

#[derive(Debug, Clone, PartialEq, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ExpressionParameter {
    pub blend: ExpressionBlend,
    pub parameter_id: String,
    pub value: f64,
}

/// A parameter preset applied over motions and under external overrides.
#[derive(Debug, Clone, PartialEq, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Expression {
    /// Cubism's sine fades and transition composition; Poffo composition when omitted.
    #[serde(default)]
    pub composition: Option<super::ExpressionComposition>,
    #[serde(default)]
    pub fade_in_time: Option<f64>,
    #[serde(default)]
    pub fade_out_time: Option<f64>,
    pub id: String,
    pub parameters: Vec<ExpressionParameter>,
}

#[derive(Debug, Clone, PartialEq, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PoseEntry {
    pub part_ids: Vec<String>,
    /// Selector value; the entry nearest to the parameter value is shown.
    pub value: f64,
}

/// Mutually exclusive part sets chosen by one parameter.
#[derive(Debug, Clone, PartialEq, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PoseGroup {
    /// Cubism source selectors in entry order; absent keeps the legacy scalar selector.
    #[serde(default)]
    pub source_parameter_ids: Option<Vec<String>>,
    pub entries: Vec<PoseEntry>,
    #[serde(default)]
    pub fade_time: Option<f64>,
    pub id: String,
    pub parameter_id: String,
}

/// A named tap region covered by its parts' deformed meshes.
#[derive(Debug, Clone, PartialEq, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct HitArea {
    pub id: String,
    pub part_ids: Vec<String>,
}
