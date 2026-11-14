//! Parameters, keyforms, motions, physics, glue and layer-order rules.

use serde::Deserialize;

use super::GlueComposition;
use super::scene::{CurveHandle, DeformerRenderProperties, Point};

#[derive(Debug, Clone, PartialEq, Deserialize)]
pub struct ParameterOption {
    pub label: String,
    pub value: f64,
}

#[derive(Debug, Clone, PartialEq, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Parameter {
    pub default_value: f64,
    /// Display group in `Document::parameter_groups`.
    #[serde(default)]
    pub group_id: Option<String>,
    pub id: String,
    pub maximum: f64,
    pub minimum: f64,
    pub name: String,
    /// Discrete values; inputs snap to the nearest option.
    #[serde(default)]
    pub options: Option<Vec<ParameterOption>>,
    /// Wraps values into `minimum..maximum` instead of limiting them (Cubism's repeat).
    #[serde(default)]
    pub repeat: Option<bool>,
}

impl Parameter {
    /// `[minimum, maximum]` when the parameter repeats.
    pub fn repeat_range(&self) -> Option<[f64; 2]> {
        (self.repeat == Some(true)).then_some([self.minimum, self.maximum])
    }

    /// `boundParameterValue`: limits `value` to the range, or wraps it there when repeating.
    pub fn bound(&self, value: f64) -> f64 {
        match self.repeat_range() {
            Some([minimum, maximum]) => minimum + (value - minimum).rem_euclid(maximum - minimum),
            None => value.clamp(self.minimum, self.maximum),
        }
    }
}

/// Keyed glue `weight`/`strength` for the glue connection `id`.
#[derive(Debug, Clone, PartialEq, Deserialize)]
pub struct GlueKeyform {
    pub id: String,
    pub strength: f64,
    pub weight: f64,
}

#[derive(Debug, Clone, PartialEq, Default, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PartKeyformProperties {
    #[serde(default)]
    pub draw_order: Option<f64>,
    pub multiply_color: Option<[f64; 3]>,
    pub opacity: Option<f64>,
    pub screen_color: Option<[f64; 3]>,
}

#[derive(Debug, Clone, PartialEq, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ParameterPartKeyform {
    #[serde(default)]
    pub glue: Option<Vec<GlueKeyform>>,
    pub part_id: String,
    #[serde(default)]
    pub properties: Option<PartKeyformProperties>,
    /// Empty means "rest vertices".
    pub vertices: Vec<f64>,
}

#[derive(Debug, Clone, PartialEq, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ParameterDeformerKeyform {
    /// Reflections are discrete keyform channels.
    #[serde(default)]
    pub rotation_reflection: Option<[bool; 2]>,
    /// Unwrapped local X-axis angle (radians); omitted keyforms keep handle-based
    /// interpolation.
    #[serde(default)]
    pub rotation_angle: Option<f64>,
    pub control_points: Vec<f64>,
    #[serde(default)]
    pub curve_handles: Option<Vec<CurveHandle>>,
    pub node_id: String,
    /// Keyed opacity and colors.
    #[serde(default)]
    pub properties: Option<DeformerRenderProperties>,
    #[serde(default)]
    pub rotation_origin: Option<Point>,
    /// Scale of a rotation deformer about its pivot, positive; 1 when omitted.
    #[serde(default)]
    pub rotation_scale: Option<f64>,
    #[serde(default)]
    pub spatial_origin: Option<[f64; 3]>,
    #[serde(default)]
    pub spatial_mesh_position: Option<[f64; 3]>,
    #[serde(default)]
    pub spatial_rotation: Option<[f64; 3]>,
    #[serde(default)]
    pub spatial_scale: Option<[f64; 3]>,
    #[serde(default)]
    pub spatial_translation: Option<[f64; 3]>,
}

/// Keyed opacity and colors of a scene group listed in `targetGroupIds`.
#[derive(Debug, Clone, PartialEq, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ParameterGroupKeyform {
    pub group_id: String,
    pub properties: PartKeyformProperties,
}

#[derive(Debug, Clone, PartialEq, Deserialize)]
pub struct ParameterKeyform {
    /// Direct weight and strength keys for targetGlueIds; legacy part.glue remains supported.
    #[serde(default)]
    pub glue: Option<Vec<GlueKeyform>>,
    /// One value per bound parameter.
    pub values: Vec<f64>,
    #[serde(default)]
    pub deformers: Option<Vec<ParameterDeformerKeyform>>,
    /// One entry per `targetGroupIds` group.
    #[serde(default)]
    pub groups: Option<Vec<ParameterGroupKeyform>>,
    pub parts: Vec<ParameterPartKeyform>,
}

#[derive(Debug, Clone, Copy, PartialEq, Deserialize)]
pub struct InfluencePoint {
    pub value: f64,
    pub weight: f64,
}

#[derive(Debug, Clone, PartialEq, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ParameterInfluence {
    pub parameter_id: String,
    pub points: Vec<InfluencePoint>,
}

/// Links one or two parameters to keyforms of parts and deformers.
#[derive(Debug, Clone, PartialEq, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ParameterBinding {
    /// Tensor-product keyform interpolation; omitted bindings keep Delaunay interpolation.
    #[serde(default)]
    pub interpolation: Option<super::BindingInterpolation>,
    /// Grid sampling policy; omitted fields retain their legacy defaults.
    #[serde(default)]
    pub sampling: Option<super::KeyformSampling>,
    /// Direct glue targets; omitted lists infer IDs from direct keyforms.
    #[serde(default)]
    pub target_glue_ids: Option<Vec<String>>,
    /// Influence curve composition; the minimum rule when omitted.
    #[serde(default)]
    pub influence_mode: Option<super::InfluenceMode>,
    /// Lets keyed opacity, colors, draw order, glue strength and rotation scale leave their
    /// display ranges (composed values are still clamped); omitted bindings reject such keyforms.
    #[serde(default)]
    pub keyform_range: Option<super::KeyformRange>,
    pub id: String,
    #[serde(default)]
    pub name: Option<String>,
    #[serde(default)]
    pub influences: Option<Vec<ParameterInfluence>>,
    #[serde(default)]
    pub target_deformer_ids: Option<Vec<String>>,
    /// Scene groups whose opacity and colors the keyforms set.
    #[serde(default)]
    pub target_group_ids: Option<Vec<String>>,
    #[serde(default)]
    pub target_part_ids: Option<Vec<String>>,
    pub parameter_ids: Vec<String>,
    pub keyforms: Vec<ParameterKeyform>,
}

/// Curve from a keyframe to the next (`PUPPET_EASINGS`). `Bezier` follows
/// [`Keyframe::bezier`]; `Stepped` holds the value until the next keyframe and `InverseStepped`
/// takes the next value right after the keyframe.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum Easing {
    Linear,
    EaseIn,
    EaseOut,
    EaseInOut,
    Bezier,
    Stepped,
    InverseStepped,
}

#[derive(Debug, Clone, Copy, PartialEq, Deserialize)]
pub struct Keyframe {
    /// `[x1, y1, x2, y2]` handles of a `Bezier` segment: `x` as a fraction of the segment's
    /// duration, `y` as a value. Omitted, they are flat at one third from each end.
    #[serde(default)]
    pub bezier: Option<[f64; 4]>,
    /// Applies from this keyframe to the next one.
    #[serde(default)]
    pub easing: Option<Easing>,
    pub time: f64,
    pub value: f64,
}

/// A marker reported when playback passes `time`.
#[derive(Debug, Clone, PartialEq, Deserialize)]
pub struct MotionEvent {
    pub time: f64,
    pub value: String,
}

/// Lip-sync analysis of the decoded motion sound.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum SoundAnalysis {
    Rms,
    Voice,
}
#[derive(Debug, Clone, Copy, PartialEq, Eq, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum SoundVolume {
    Source,
    Motion,
}

/// PCM or float WAV file as a base64 data URL or a path relative to the document.
#[derive(Debug, Clone, PartialEq, Eq, Deserialize)]
pub struct MotionSound {
    /// RMS uses all channels; omitted analysis keeps the existing voice estimator.
    #[serde(default)]
    pub analysis: Option<SoundAnalysis>,
    /// Source volume is independent of fades; omitted RMS audio uses source volume.
    #[serde(default)]
    pub volume: Option<SoundVolume>,
    pub src: String,
}

impl MotionSound {
    /// WAV media types a data URL `src` may declare (`PUPPET_SOUND_MEDIA_TYPES`).
    pub const MEDIA_TYPES: [&str; 3] = ["audio/wav", "audio/wave", "audio/x-wav"];

    /// A non-empty `src`; a data URL must be base64 with a WAV media type. A `data:` string
    /// without a comma counts as a path, as in the TypeScript parser.
    pub fn is_valid(&self) -> bool {
        let Some(header) = self
            .src
            .strip_prefix("data:")
            .and_then(|rest| rest.split_once(','))
            .map(|(header, _)| header)
        else {
            return !self.src.is_empty();
        };
        let mut fields = header.split(';');
        let media = fields.next().unwrap_or_default().to_ascii_lowercase();
        let parameters: Vec<&str> = fields.collect();
        Self::MEDIA_TYPES.contains(&media.as_str())
            && !parameters.is_empty()
            && parameters.contains(&"base64")
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum TrackAxis {
    X,
    Y,
}

#[derive(Debug, Clone, PartialEq, Deserialize)]
#[serde(tag = "kind", rename_all = "kebab-case")]
pub enum Track {
    #[serde(rename_all = "camelCase")]
    Parameter {
        keyframes: Vec<Keyframe>,
        parameter_id: String,
        #[serde(default)]
        fade_in_time: Option<f64>,
        #[serde(default)]
        fade_out_time: Option<f64>,
    },
    #[serde(rename_all = "camelCase")]
    Vertex {
        axis: TrackAxis,
        keyframes: Vec<Keyframe>,
        part_id: String,
        vertex_index: usize,
        #[serde(default)]
        fade_in_time: Option<f64>,
        #[serde(default)]
        fade_out_time: Option<f64>,
    },
    /// Cubism's model curves (`opacity`, `eye-blink` openness, `lip-sync` level).
    #[serde(rename_all = "camelCase")]
    Model {
        keyframes: Vec<Keyframe>,
        target: ModelTrackTarget,
        #[serde(default)]
        fade_in_time: Option<f64>,
        #[serde(default)]
        fade_out_time: Option<f64>,
    },
    /// A scene group's opacity (Cubism's part opacity curve).
    #[serde(rename_all = "camelCase")]
    GroupOpacity {
        group_id: String,
        keyframes: Vec<Keyframe>,
        #[serde(default)]
        fade_in_time: Option<f64>,
        #[serde(default)]
        fade_out_time: Option<f64>,
    },
}

/// What a model track drives.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum ModelTrackTarget {
    /// Model opacity, 0..1.
    Opacity,
    /// Eye openness, 0..1, for the eye-blink role parameters.
    EyeBlink,
    /// Mouth level added to (or set on) the lip-sync role parameters.
    LipSync,
}

impl Track {
    pub fn keyframes(&self) -> &[Keyframe] {
        match self {
            Self::Parameter { keyframes, .. }
            | Self::Vertex { keyframes, .. }
            | Self::Model { keyframes, .. }
            | Self::GroupOpacity { keyframes, .. } => keyframes,
        }
    }

    /// The track's own `(fadeInTime, fadeOutTime)`, which replace the motion's.
    pub fn fade(&self) -> (Option<f64>, Option<f64>) {
        match self {
            Self::Parameter {
                fade_in_time,
                fade_out_time,
                ..
            }
            | Self::Vertex {
                fade_in_time,
                fade_out_time,
                ..
            }
            | Self::Model {
                fade_in_time,
                fade_out_time,
                ..
            }
            | Self::GroupOpacity {
                fade_in_time,
                fade_out_time,
                ..
            } => (*fade_in_time, *fade_out_time),
        }
    }
}

#[derive(Debug, Clone, PartialEq, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Motion {
    #[serde(default)]
    pub parameter_bounds: Option<String>,
    pub duration: f64,
    #[serde(default)]
    pub events: Vec<MotionEvent>,
    /// Seconds; 0 (no fade) when omitted, unlike Cubism's 1 second.
    #[serde(default)]
    pub fade_in_time: Option<f64>,
    #[serde(default)]
    pub fade_out_time: Option<f64>,
    /// Frame rate for editing this motion's timeline (Cubism's motion3 `Fps`); the document's
    /// when omitted. Playback uses seconds and ignores it.
    #[serde(default)]
    pub frames_per_second: Option<u32>,
    /// Motion group; playing the group picks one of its motions at random.
    #[serde(default)]
    pub group: Option<String>,
    pub id: String,
    /// Whether playback loops when the caller does not say; `true` when omitted.
    #[serde(default, rename = "loop")]
    pub looping: Option<bool>,
    /// Display name.
    #[serde(default)]
    pub name: Option<String>,
    #[serde(default)]
    pub sound: Option<MotionSound>,
    #[serde(default)]
    pub timeline_parameter_ids: Option<Vec<String>>,
    pub tracks: Vec<Track>,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum OutputMode {
    Position,
    /// Outputs the simulated position minus the current target.
    Lag,
}

/// Damped spring from an input parameter to an output parameter.
#[derive(Debug, Clone, PartialEq, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Pendulum {
    pub damping: f64,
    pub gravity: f64,
    pub id: String,
    pub input_parameter_id: String,
    pub input_scale: f64,
    pub length: f64,
    pub output_parameter_id: String,
    #[serde(default)]
    pub output_mode: Option<OutputMode>,
    pub output_scale: f64,
}

#[derive(Debug, Clone, PartialEq, Default, Deserialize)]
pub struct Physics {
    pub pendulums: Vec<Pendulum>,
    #[serde(default)]
    pub chains: Vec<super::physics::PhysicsChain>,
    /// Chain steps per second ([`super::physics::DEFAULT_CHAIN_FPS`] when omitted).
    #[serde(default)]
    pub fps: Option<f64>,
    /// Gravity direction for chains, `[x, y]` with `y` down; its length is ignored.
    #[serde(default)]
    pub gravity: Option<[f64; 2]>,
    /// Wind added to every chain pendulum's pull, `[x, y]` with `y` down.
    #[serde(default)]
    pub wind: Option<[f64; 2]>,
}

#[derive(Debug, Clone, PartialEq, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct VertexReference {
    pub part_id: String,
    pub vertex_index: usize,
}

#[derive(Debug, Clone, Copy, PartialEq, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GlueEdge {
    pub end_index: usize,
    pub position: f64,
}

/// The second glue endpoint: a vertex, or a fixed position along a boundary edge.
#[derive(Debug, Clone, PartialEq, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GlueTarget {
    pub part_id: String,
    pub vertex_index: usize,
    #[serde(default)]
    pub edge: Option<GlueEdge>,
}

#[derive(Debug, Clone, PartialEq, Deserialize)]
pub struct Glue {
    pub id: String,
    pub first: VertexReference,
    pub second: GlueTarget,
    /// The second endpoint's share of the joined position.
    pub weight: f64,
    pub strength: f64,
    /// Lets this connection share moving vertices with other sequential connections, even
    /// without the document-wide `glueComposition`. Only validation reads it.
    #[serde(default)]
    pub composition: Option<GlueComposition>,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum LayerOrderComparison {
    GreaterThan,
    LessThan,
}

#[derive(Debug, Clone, PartialEq, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LayerOrderCondition {
    /// The sum of these resolved values is compared against the threshold.
    pub parameter_ids: Vec<String>,
    pub comparison: LayerOrderComparison,
    pub threshold: f64,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum Placement {
    Before,
    After,
}

#[derive(Debug, Clone, PartialEq, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LayerOrderRule {
    pub part_ids: Vec<String>,
    pub reference_part_id: String,
    pub placement: Placement,
    pub when: LayerOrderCondition,
}
