//! Typed view of a `winter-love-poffo` v1 document (mirrors `player/document.ts`).
//!
//! Only fields the runtime reads are typed; editor metadata such as `psdSource` stays in the
//! JSON value that [`crate::PoffoFile`] keeps for lossless conversion.

mod animation;
mod model;
mod physics;
mod presets;
mod sampling;
mod scene;

pub use sampling::*;

pub use animation::{
    Easing, Glue, GlueEdge, GlueKeyform, GlueTarget, InfluencePoint, Keyframe,
    LayerOrderComparison, LayerOrderCondition, LayerOrderRule, ModelTrackTarget, Motion,
    MotionEvent, MotionSound, OutputMode, Parameter, ParameterBinding, ParameterDeformerKeyform,
    ParameterGroupKeyform, ParameterInfluence, ParameterKeyform, ParameterOption,
    ParameterPartKeyform, PartKeyformProperties, Pendulum, Physics, Placement, SoundAnalysis,
    SoundVolume, Track, TrackAxis, VertexReference,
};
pub use model::{
    BreathParameter, Layout, LookParameter, MouthShapes, ParameterGroup, ParameterRoles,
    VowelValues,
};
pub use physics::{
    ChainPendulum, DEFAULT_CHAIN_FPS, DEFAULT_CHAIN_GRAVITY, PhysicsAxis, PhysicsChain,
    PhysicsInput, PhysicsNormalization, PhysicsOutput, PhysicsRange,
};
pub use presets::{
    DEFAULT_EXPRESSION_FADE_TIME, DEFAULT_POSE_FADE_TIME, Expression, ExpressionBlend,
    ExpressionParameter, HitArea, PoseEntry, PoseGroup,
};
pub use scene::{
    BoneWeights, CurveAxis, CurveHandle, DeformerBinding, DeformerBindingStep, DeformerBounds,
    DeformerNode, DeformerRenderProperties, DeformerShape, DeformerType, GroupNode,
    GroupRenderProperties, PartNode, Pin, Point, Scene, SceneNode, SkinBinding, SkinInfluence,
    SkinMatrix, SkinMode, SpatialMesh, VertexInfluence,
};

use std::sync::Arc;

use serde::Deserialize;

pub const DOCUMENT_FORMAT: &str = "winter-love-poffo";
/// Earlier format names (`LEGACY_PUPPET_DOCUMENT_FORMATS`); [`crate::PoffoFile`] reads them as
/// [`DOCUMENT_FORMAT`].
pub const LEGACY_DOCUMENT_FORMATS: &[&str] = &["winter-love-puppet"];

/// Whether `format` names this format, now or under an earlier name. [`crate::validate`] uses it
/// because a [`Document`] can also be deserialized directly, without [`crate::PoffoFile`]'s
/// renaming.
pub fn is_document_format(format: &str) -> bool {
    format == DOCUMENT_FORMAT || LEGACY_DOCUMENT_FORMATS.contains(&format)
}
pub const DOCUMENT_VERSION: u32 = 1;
pub const DEFAULT_FRAMES_PER_SECOND: u32 = 24;
/// Frame rates of the document and its motions.
pub const FRAMES_PER_SECOND_RANGE: std::ops::RangeInclusive<u32> = 1..=240;
/// Draw order range end and the value of parts and draw order groups that omit it.
pub const MAXIMUM_DRAW_ORDER: f64 = 1000.0;
pub const DEFAULT_DRAW_ORDER: f64 = 500.0;

#[derive(Debug, Clone, PartialEq, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Document {
    /// Motion-only values may continue from the preceding evaluated motion frame.
    #[serde(default)]
    pub motion_parameter_base: Option<MotionParameterBase>,
    /// Precision used after motion composition; omitted documents keep their existing precision.
    #[serde(default)]
    pub motion_parameter_precision: Option<NumberPrecision>,
    /// Equal draw orders use document part order when explicitly selected.
    #[serde(default)]
    pub draw_order_tie_break: Option<DrawOrderTieBreak>,
    /// Cubism combines inherited multiply and screen colors independently; omitted documents
    /// compose color effects in sequence.
    #[serde(default)]
    pub color_composition: Option<ColorComposition>,
    /// Cubism integer draw orders; omitted documents keep fractional orders.
    #[serde(default)]
    pub draw_order_rounding: Option<DrawOrderRounding>,
    /// Shared glue vertices computed in order; omitted documents keep exclusive vertices.
    #[serde(default)]
    pub glue_composition: Option<GlueComposition>,
    pub format: String,
    pub version: u32,
    /// Automatic breathing, one entry per parameter.
    #[serde(default)]
    pub breath: Vec<BreathParameter>,
    #[serde(default)]
    pub expressions: Vec<Expression>,
    #[serde(default)]
    pub frames_per_second: Option<u32>,
    #[serde(default)]
    pub glue: Vec<Glue>,
    #[serde(default)]
    pub hit_areas: Vec<HitArea>,
    /// Applied in order, starting from scene order, on every frame.
    #[serde(default)]
    pub layer_order_rules: Vec<LayerOrderRule>,
    /// Default framing; the whole viewport when omitted.
    #[serde(default)]
    pub layout: Option<Layout>,
    /// Parameters that follow where the model looks, one entry per parameter.
    #[serde(default)]
    pub look: Vec<LookParameter>,
    pub motions: Vec<Motion>,
    /// Vowel mouth shapes for lip sync from audio.
    #[serde(default)]
    pub mouth_shapes: Option<MouthShapes>,
    #[serde(default)]
    pub parameter_bindings: Vec<ParameterBinding>,
    #[serde(default)]
    pub parameter_groups: Vec<ParameterGroup>,
    #[serde(default)]
    pub parameter_roles: ParameterRoles,
    #[serde(default)]
    pub parameters: Vec<Parameter>,
    pub parts: Vec<Part>,
    #[serde(default)]
    pub physics: Option<Physics>,
    /// Each group shows one entry's parts and hides the parts of its other entries.
    #[serde(default)]
    pub pose_groups: Vec<PoseGroup>,
    #[serde(default)]
    pub scene: Option<Scene>,
    pub viewport: Viewport,
}

impl Document {
    pub fn frames_per_second(&self) -> u32 {
        self.frames_per_second.unwrap_or(DEFAULT_FRAMES_PER_SECOND)
    }

    /// The explicit scene, or one root part node per part for documents without a scene.
    pub fn scene_roots(&self) -> Vec<SceneNode> {
        match &self.scene {
            Some(scene) => scene.roots.clone(),
            None => self
                .parts
                .iter()
                .map(|part| {
                    SceneNode::Part(PartNode {
                        parameter_visibility: None,
                        id: part.id.clone(),
                        name: part.id.clone(),
                        visible: true,
                        locked: false,
                        skinning: None,
                    })
                })
                .collect(),
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Deserialize)]
pub struct Viewport {
    pub width: f64,
    pub height: f64,
}

#[derive(Debug, Clone, PartialEq, Deserialize)]
pub struct Texture {
    /// Shared by every part that names the same `textureAssets` entry.
    #[serde(deserialize_with = "shared_str")]
    pub src: Arc<str>,
    pub width: u32,
    pub height: u32,
    /// The part's own image within a texture shared with other parts (an atlas). UVs still
    /// address the whole texture; editors use the region to give each part its image back.
    #[serde(default)]
    pub region: Option<TextureRegion>,
}

/// A rectangle of whole pixels within a texture image.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Deserialize)]
pub struct TextureRegion {
    pub x: u32,
    pub y: u32,
    pub width: u32,
    pub height: u32,
}

#[derive(Debug, Clone, PartialEq, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Mesh {
    /// XY pairs in document coordinates (pixels, Y down).
    pub vertices: Vec<f64>,
    /// UV pairs with the origin at the top-left of the texture.
    pub uvs: Vec<f64>,
    pub indices: Vec<u32>,
    /// Index connectivity only; omitted meshes also validate planar rest geometry.
    #[serde(default)]
    pub validation_space: Option<ValidationSpace>,
}

impl Mesh {
    pub fn vertex_count(&self) -> usize {
        self.vertices.len() / 2
    }
}

/// Color blend of a part over its backdrop (`PUPPET_PART_BLEND_MODES`).
///
/// `Normal`, `Add`, `Multiply` and `Screen` with [`AlphaBlendMode::Over`] keep the
/// fixed-function premultiplied semantics; every other combination composites with the
/// W3C Compositing and Blending formulas. Declaration order is the shader mode number.
/// `LinearDodge` is Cubism's Add and `AddGlow` its Add (Glow): the same sum without limiting
/// it to 1 (an unverified reading; Cubism publishes no formula).
#[derive(Debug, Clone, Copy, PartialEq, Eq, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum BlendMode {
    Normal,
    Add,
    Multiply,
    Screen,
    Darken,
    Lighten,
    ColorBurn,
    LinearBurn,
    ColorDodge,
    LinearDodge,
    Overlay,
    SoftLight,
    HardLight,
    LinearLight,
    Difference,
    Exclusion,
    Hue,
    Saturation,
    Color,
    Luminosity,
    AddGlow,
    /// Cubism's earlier Add: the sum over the backdrop, keeping the backdrop's coverage.
    AddCompatible,
    /// Cubism's earlier Multiply: `front·back + back·(1 − front alpha)`, keeping the backdrop's
    /// coverage.
    MultiplyCompatible,
    /// Cubism's Multiply as a separable W3C blend (composited with the alpha mode).
    MultiplyOver,
}

/// How a part's coverage combines with its backdrop's (`PUPPET_ALPHA_BLEND_MODES`),
/// following the `KHR_blend_equation_advanced` overlap model. Declaration order is the
/// shader mode number.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Default, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum AlphaBlendMode {
    #[default]
    Over,
    Atop,
    Out,
    ConjointOver,
    DisjointOver,
}

#[derive(Debug, Clone, PartialEq, Default, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PartRenderProperties {
    pub alpha_blend_mode: Option<AlphaBlendMode>,
    pub blend_mode: Option<BlendMode>,
    pub clipping_mask_ids: Option<Vec<String>>,
    /// Hides triangles turned over relative to the rest mesh.
    pub culling: Option<bool>,
    /// Cubism draw order, 0..=1000 ([`DEFAULT_DRAW_ORDER`] when omitted).
    pub draw_order: Option<f64>,
    pub inverted_mask: Option<bool>,
    pub multiply_color: Option<[f64; 3]>,
    pub opacity: Option<f64>,
    pub render_when_used_as_mask: Option<bool>,
    pub screen_color: Option<[f64; 3]>,
}

#[derive(Debug, Clone, PartialEq, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SpatialAttachment {
    pub triangle_index: u32,
    pub weights: [f64; 3],
    pub offset: [f64; 3],
}

/// 3D placement of a part's image vertices, projected by a spatial deformer.
#[derive(Debug, Clone, PartialEq, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SpatialSurface {
    pub attachments: Option<Vec<SpatialAttachment>>,
    /// XYZ triples in mesh-vertex order; positive Z faces the viewer.
    pub control_points: Vec<f64>,
    pub group_id: Option<String>,
    pub origin: [f64; 3],
}

#[derive(Debug, Clone, PartialEq, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Part {
    pub id: String,
    pub mesh: Mesh,
    #[serde(default)]
    pub properties: Option<PartRenderProperties>,
    #[serde(default)]
    pub spatial: Option<SpatialSurface>,
    pub texture: Texture,
    /// Free text for apps (Cubism's userdata3).
    #[serde(default)]
    pub user_data: Option<String>,
}

fn shared_str<'de, D: serde::Deserializer<'de>>(deserializer: D) -> Result<Arc<str>, D::Error> {
    String::deserialize(deserializer).map(Arc::from)
}
