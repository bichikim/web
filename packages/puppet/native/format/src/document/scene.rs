//! Scene graph: groups, deformers and part nodes.

use serde::Deserialize;

use super::{AlphaBlendMode, BlendMode};

#[derive(Debug, Clone, PartialEq, Default, Deserialize)]
pub struct Scene {
    pub roots: Vec<SceneNode>,
}

impl Scene {
    /// Every node, each before its children, in document order. Iterative, so deep scenes
    /// cannot overflow the stack.
    pub fn nodes(&self) -> impl Iterator<Item = &SceneNode> {
        let mut pending: Vec<&SceneNode> = self.roots.iter().rev().collect();
        std::iter::from_fn(move || {
            let node = pending.pop()?;
            pending.extend(node.children().iter().rev());
            Some(node)
        })
    }
}

#[derive(Debug, Clone, PartialEq, Deserialize)]
#[serde(tag = "kind", rename_all = "kebab-case")]
pub enum SceneNode {
    Group(GroupNode),
    Deformer(Box<DeformerNode>),
    Part(PartNode),
}

impl SceneNode {
    pub fn id(&self) -> &str {
        match self {
            Self::Group(node) => &node.id,
            Self::Deformer(node) => &node.id,
            Self::Part(node) => &node.id,
        }
    }

    pub fn visible(&self) -> bool {
        match self {
            Self::Group(node) => node.visible,
            Self::Deformer(node) => node.visible,
            Self::Part(node) => node.visible,
        }
    }

    /// The node's `parameterVisibility` intervals; empty for static visibility.
    pub fn parameter_visibility(&self) -> &[super::ParameterVisibility] {
        match self {
            Self::Group(node) => node.parameter_visibility.as_deref(),
            Self::Deformer(node) => node.parameter_visibility.as_deref(),
            Self::Part(node) => node.parameter_visibility.as_deref(),
        }
        .unwrap_or_default()
    }

    pub fn children(&self) -> &[SceneNode] {
        match self {
            Self::Group(node) => &node.children,
            Self::Deformer(node) => &node.children,
            Self::Part(_) => &[],
        }
    }
}

#[derive(Debug, Clone, PartialEq, Deserialize)]
pub struct GroupNode {
    /// Visible only while every mapped parameter lies in its interval; static visibility
    /// when omitted.
    #[serde(default, rename = "parameterVisibility")]
    pub parameter_visibility: Option<Vec<super::ParameterVisibility>>,
    pub id: String,
    pub name: String,
    pub visible: bool,
    pub locked: bool,
    pub children: Vec<SceneNode>,
    #[serde(default)]
    pub properties: Option<GroupRenderProperties>,
}

/// Rest render properties of a group (`PuppetGroupRenderProperties`).
///
/// Without `offscreen`, opacity and colors apply to every descendant after its own. With it,
/// the descendants are drawn into an isolated layer that these properties, the blend modes and
/// the clipping mask composite once; the members paint together at the first one's position.
#[derive(Debug, Clone, PartialEq, Default, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GroupRenderProperties {
    pub alpha_blend_mode: Option<AlphaBlendMode>,
    pub blend_mode: Option<BlendMode>,
    pub clipping_mask_ids: Option<Vec<String>>,
    /// Makes the group a draw order group (Cubism's grouped part) at this draw order.
    pub draw_order: Option<f64>,
    pub inverted_mask: Option<bool>,
    pub multiply_color: Option<[f64; 3]>,
    pub offscreen: Option<bool>,
    pub opacity: Option<f64>,
    pub screen_color: Option<[f64; 3]>,
}

/// Opacity and colors a deformer passes to everything inside it, folded like a plain group's.
/// Other render properties are rejected.
#[derive(Debug, Clone, PartialEq, Default, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct DeformerRenderProperties {
    pub multiply_color: Option<[f64; 3]>,
    pub opacity: Option<f64>,
    pub screen_color: Option<[f64; 3]>,
}

#[derive(Debug, Clone, PartialEq, Deserialize)]
pub struct PartNode {
    /// Visible only while every mapped parameter lies in its interval; static visibility
    /// when omitted.
    #[serde(default, rename = "parameterVisibility")]
    pub parameter_visibility: Option<Vec<super::ParameterVisibility>>,
    pub id: String,
    pub name: String,
    pub visible: bool,
    pub locked: bool,
    #[serde(default)]
    pub skinning: Option<SkinBinding>,
}

#[derive(Debug, Clone, PartialEq, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DeformerNode {
    /// Visible only while every mapped parameter lies in its interval; static visibility
    /// when omitted.
    #[serde(default, rename = "parameterVisibility")]
    pub parameter_visibility: Option<Vec<super::ParameterVisibility>>,
    pub id: String,
    pub name: String,
    pub visible: bool,
    pub locked: bool,
    pub children: Vec<SceneNode>,
    #[serde(flatten)]
    pub shape: DeformerShape,
    #[serde(default)]
    pub properties: Option<DeformerRenderProperties>,
    #[serde(default)]
    pub spatial_mesh: Option<SpatialMesh>,
    #[serde(default)]
    pub spatial_mesh_position: Option<[f64; 3]>,
    #[serde(default)]
    pub spatial_origin: Option<[f64; 3]>,
    #[serde(default)]
    pub spatial_rotation: Option<[f64; 3]>,
    #[serde(default)]
    pub spatial_scale: Option<[f64; 3]>,
    #[serde(default)]
    pub spatial_translation: Option<[f64; 3]>,
    /// Earlier control layouts preserved so re-laid-out deformers keep their mapping.
    #[serde(default)]
    pub binding: Option<DeformerBinding>,
}

#[derive(Debug, Clone, Copy, PartialEq, Deserialize)]
pub struct Point {
    pub x: f64,
    pub y: f64,
}

#[derive(Debug, Clone, Copy, PartialEq, Deserialize)]
pub struct DeformerBounds {
    pub x: f64,
    pub y: f64,
    pub width: f64,
    pub height: f64,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum DeformerType {
    /// A rigid pivot plus direction handle (exactly one bone segment).
    Rotation,
    /// Projects attached parts through a 3D control surface.
    Spatial,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum CurveAxis {
    X,
    Y,
}

#[derive(Debug, Clone, Copy, PartialEq, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CurveHandle {
    pub horizontal: Point,
    pub point_index: usize,
    pub vertical: Point,
}

#[derive(Debug, Clone, PartialEq, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct VertexInfluence {
    pub part_id: String,
    pub vertex_index: usize,
    pub weight: f64,
}

#[derive(Debug, Clone, PartialEq, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BoneWeights {
    pub part_id: String,
    pub vertex_index: usize,
    pub weights: Vec<f64>,
}

#[derive(Debug, Clone, Copy, PartialEq, Deserialize)]
pub struct Pin {
    pub x: f64,
    pub y: f64,
    pub radius: f64,
    pub strength: f64,
}

/// Geometry shared by deformer nodes and their preserved binding layouts.
///
/// The variant is implied by which optional fields are present: `pins`, then
/// `boneRestPoints`, then `curveAxis`, otherwise a `columns × rows` warp grid.
#[derive(Debug, Clone, PartialEq, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DeformerShape {
    /// Parent-local deformation; omitted layouts use document-space composition.
    #[serde(default)]
    pub coordinate_space: Option<super::CoordinateSpace>,
    /// Piecewise triangular warp surface; omitted layouts use legacy curved interpolation.
    #[serde(default)]
    pub interpolation: Option<super::DeformerInterpolation>,
    /// Reflections about a rotation pivot; false on both axes when omitted.
    #[serde(default)]
    pub rotation_reflection: Option<[bool; 2]>,
    /// Unwrapped local X-axis angle (radians) of a rotation deformer; derived from its handle
    /// as the shortest angle when omitted.
    #[serde(default)]
    pub rotation_angle: Option<f64>,
    /// Signed local distance deriving a parent-space rotation frame; 0.1 when omitted.
    #[serde(default)]
    pub rotation_reference_distance: Option<f64>,
    #[serde(default)]
    pub deformer_type: Option<DeformerType>,
    #[serde(default)]
    pub vertex_influences: Option<Vec<VertexInfluence>>,
    #[serde(default)]
    pub bone_weights: Option<Vec<BoneWeights>>,
    #[serde(default)]
    pub pins: Option<Vec<Pin>>,
    #[serde(default)]
    pub bone_rest_points: Option<Vec<f64>>,
    #[serde(default)]
    pub curve_breaks: Option<Vec<f64>>,
    #[serde(default)]
    pub curve_axis: Option<CurveAxis>,
    pub bounds: DeformerBounds,
    pub columns: u32,
    pub control_points: Vec<f64>,
    #[serde(default)]
    pub curve_handles: Option<Vec<CurveHandle>>,
    #[serde(default)]
    pub rotation_origin: Option<Point>,
    /// Base scale about a rotation pivot; 1 when omitted.
    #[serde(default)]
    pub rotation_scale: Option<f64>,
    pub rows: u32,
}

#[derive(Debug, Clone, PartialEq, Deserialize)]
pub struct DeformerBindingStep {
    pub shape: DeformerShape,
    #[serde(default)]
    pub rest: Option<DeformerShape>,
}

#[derive(Debug, Clone, PartialEq, Deserialize)]
pub struct DeformerBinding {
    pub rest: DeformerShape,
    pub steps: Vec<DeformerBindingStep>,
}

/// Triangle mesh in document coordinates that spatial parts attach to.
#[derive(Debug, Clone, PartialEq, Deserialize)]
pub struct SpatialMesh {
    pub indices: Vec<u32>,
    /// XYZ triples.
    pub vertices: Vec<f64>,
}

#[derive(Debug, Clone, Copy, PartialEq, Deserialize)]
pub struct SkinMatrix {
    pub xx: f64,
    pub yx: f64,
    pub xy: f64,
    pub yy: f64,
    pub x: f64,
    pub y: f64,
}

#[derive(Debug, Clone, PartialEq, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SkinInfluence {
    #[serde(default)]
    pub strength: Option<f64>,
    pub node_id: String,
    pub inverse_bind: SkinMatrix,
    pub weights: Vec<f64>,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum SkinMode {
    Joint,
    Smooth,
}

#[derive(Debug, Clone, PartialEq, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SkinBinding {
    #[serde(default)]
    pub mode: Option<SkinMode>,
    #[serde(default)]
    pub range: Option<f64>,
    #[serde(default)]
    pub sync_seams: Option<bool>,
    pub bind: SkinMatrix,
    pub influences: Vec<SkinInfluence>,
}
