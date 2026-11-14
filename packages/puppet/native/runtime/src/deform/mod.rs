//! Deformer nodes: static data compiled at load and per-frame posed control points.

pub(crate) mod parent;
mod shape;
pub(crate) mod skin;
mod warp_grid;

use poffo_format::document::{CurveHandle, DeformerNode, DeformerShape, DeformerType};

use crate::geometry::{Vec2, wrap_angle};
pub(crate) use shape::{
    BoneSegment, Layout, ShapeLookups, VertexKey, bone_channels, bone_segments, handle_table,
    pose_bone_channels,
};

/// Rotation deformers whose preserved layouts are all rotations keep rigid skin frames.
pub(crate) fn is_rigid_rotation(node: &DeformerNode) -> bool {
    let rotation = |t: Option<DeformerType>| t == Some(DeformerType::Rotation);
    rotation(node.shape.deformer_type)
        && node.binding.as_ref().is_none_or(|binding| {
            rotation(binding.rest.deformer_type)
                && binding.steps.iter().all(|step| {
                    rotation(step.shape.deformer_type)
                        && step.rest.as_ref().is_none_or(|r| rotation(r.deformer_type))
                })
        })
}

const INVERSE_EPSILON_RATIO: f64 = 0.0001;
const INVERSE_ITERATIONS: usize = 8;
const MINIMUM_DETERMINANT: f64 = 0.000_000_1;

/// A layout with its lookups and handle table (binding rest or step layouts).
#[derive(Debug, Clone)]
pub(crate) struct StaticLayout {
    pub(crate) shape: DeformerShape,
    pub(crate) lookups: ShapeLookups,
    pub(crate) handles: Vec<Option<CurveHandle>>,
    bones: Vec<BoneSegment>,
}

impl StaticLayout {
    fn new(shape: DeformerShape, part_index: &impl Fn(&str) -> Option<usize>) -> Self {
        Self {
            lookups: ShapeLookups::new(&shape, part_index),
            handles: handle_table(&shape, shape.curve_handles.as_deref()),
            bones: bone_segments(
                &shape,
                &shape.control_points,
                shape.rotation_scale.unwrap_or(1.0),
            ),
            shape,
        }
    }

    pub(crate) fn layout(&self) -> Layout<'_> {
        Layout {
            shape: &self.shape,
            control_points: &self.shape.control_points,
            handles: &self.handles,
            lookups: &self.lookups,
            bones: &self.bones,
            rotation_reflection: self.shape.rotation_reflection.unwrap_or([false; 2]),
        }
    }
}

#[derive(Debug, Clone)]
pub(crate) struct BindingStep {
    pub(crate) shape: StaticLayout,
    pub(crate) rest: Option<StaticLayout>,
}

#[derive(Debug, Clone)]
pub(crate) struct DeformerBindingLayouts {
    pub(crate) rest: StaticLayout,
    pub(crate) steps: Vec<BindingStep>,
}

/// Static data of one deformer node.
#[derive(Debug, Clone)]
pub(crate) struct CompiledDeformer {
    pub(crate) node: DeformerNode,
    pub(crate) lookups: ShapeLookups,
    pub(crate) binding: Option<DeformerBindingLayouts>,
    /// Fields other than control points and handles equal the binding rest layout.
    static_shape_matches_binding: bool,
}

/// `sameDeformerShape` apart from the posed fields: control points and handles, and a rotation
/// deformer's scale, reflection and angle, which composition always rewrites.
fn same_static_shape(a: &DeformerShape, b: &DeformerShape) -> bool {
    let rotation = a.deformer_type == Some(DeformerType::Rotation);
    a.bone_rest_points == b.bone_rest_points
        && a.bone_weights == b.bone_weights
        && a.bounds == b.bounds
        && a.columns == b.columns
        && a.curve_axis == b.curve_axis
        && a.curve_breaks == b.curve_breaks
        && a.deformer_type == b.deformer_type
        && a.pins == b.pins
        && a.rows == b.rows
        && a.interpolation == b.interpolation
        && a.rotation_reference_distance == b.rotation_reference_distance
        && (rotation
            || (a.rotation_scale == b.rotation_scale
                && a.rotation_reflection == b.rotation_reflection
                && a.rotation_angle == b.rotation_angle))
        && a.vertex_influences == b.vertex_influences
}

impl CompiledDeformer {
    pub(crate) fn new(node: &DeformerNode, part_index: &impl Fn(&str) -> Option<usize>) -> Self {
        let binding = node.binding.as_ref().map(|binding| DeformerBindingLayouts {
            rest: StaticLayout::new(binding.rest.clone(), part_index),
            steps: binding
                .steps
                .iter()
                .map(|step| BindingStep {
                    shape: StaticLayout::new(step.shape.clone(), part_index),
                    rest: step
                        .rest
                        .clone()
                        .map(|rest| StaticLayout::new(rest, part_index)),
                })
                .collect(),
        });
        let static_shape_matches_binding = node
            .binding
            .as_ref()
            .is_some_and(|b| same_static_shape(&node.shape, &b.rest));
        let mut node = node.clone();
        node.children.clear();
        Self {
            lookups: ShapeLookups::new(&node.shape, part_index),
            binding,
            static_shape_matches_binding,
            node,
        }
    }

    pub(crate) fn is_spatial(&self) -> bool {
        self.node.shape.deformer_type == Some(DeformerType::Spatial)
    }

    /// Coordinates keyed by parameters: bone channels for bone chains, else control points.
    pub(crate) fn channels_from_control_points(&self, control_points: &[f64]) -> Vec<f64> {
        match &self.node.shape.bone_rest_points {
            Some(rest) => bone_channels(rest, control_points),
            None => control_points.to_vec(),
        }
    }

    /// The rest direction of a rotation deformer's handle (`[0, 0, 1, 0]` without a rest bone).
    pub(crate) fn rest_angle(&self) -> f64 {
        let rest = self.node.shape.bone_rest_points.as_deref();
        let at = |i: usize| {
            rest.map_or([0.0, 0.0, 1.0, 0.0][i], |r| {
                r.get(i).copied().unwrap_or(0.0)
            })
        };
        (at(3) - at(1)).atan2(at(2) - at(0))
    }

    /// `getDeformerCoordinates`: with an unwrapped `angle`, a rotation deformer keys its pivot
    /// and the angle relative to its rest handle, keeping whole turns; otherwise
    /// [`Self::channels_from_control_points`].
    pub(crate) fn channels_with_angle(
        &self,
        control_points: &[f64],
        angle: Option<f64>,
    ) -> Vec<f64> {
        let Some(angle) =
            angle.filter(|_| self.node.shape.deformer_type == Some(DeformerType::Rotation))
        else {
            return self.channels_from_control_points(control_points);
        };
        let at = |i: usize| control_points.get(i).copied().unwrap_or(0.0);
        let direction = (at(3) - at(1)).atan2(at(2) - at(0));
        let offset = direction - angle;
        let unwrapped = angle + wrap_angle(offset);
        vec![at(0), at(1), unwrapped - self.rest_angle()]
    }

    pub(crate) fn control_points_from_channels(&self, channels: &[f64]) -> Vec<f64> {
        match &self.node.shape.bone_rest_points {
            Some(rest) => pose_bone_channels(rest, channels),
            None => channels.to_vec(),
        }
    }
}

/// Spatial transform channels of a posed spatial deformer.
#[derive(Debug, Clone, Copy, PartialEq, Default)]
pub(crate) struct SpatialPose {
    pub(crate) mesh_position: [f64; 3],
    pub(crate) origin: [f64; 3],
    pub(crate) rotation: [f64; 3],
    pub(crate) scale: [f64; 3],
    pub(crate) translation: [f64; 3],
}

/// A rotation deformer's composed scale, reflection and unwrapped angle.
#[derive(Debug, Clone, Copy, PartialEq)]
pub(crate) struct RotationPose {
    pub(crate) scale: f64,
    pub(crate) reflection: [bool; 2],
    pub(crate) angle: Option<f64>,
}

/// A deformer with this frame's control points.
#[derive(Debug, Clone)]
pub(crate) struct PosedDeformer<'m> {
    pub(crate) compiled: &'m CompiledDeformer,
    pub(crate) control_points: Vec<f64>,
    pub(crate) handles: Vec<Option<CurveHandle>>,
    pub(crate) spatial: Option<SpatialPose>,
    pub(crate) rotation: RotationPose,
    bones: Vec<BoneSegment>,
    /// `sameDeformerShape(node, binding.rest)` for the posed layout with a unit, unreflected
    /// rotation.
    matches_binding_rest: bool,
}

impl<'m> PosedDeformer<'m> {
    pub(crate) fn new(
        compiled: &'m CompiledDeformer,
        control_points: Vec<f64>,
        handle_list: Option<Vec<CurveHandle>>,
        spatial: Option<SpatialPose>,
        rotation: RotationPose,
    ) -> Self {
        let handles = handle_table(&compiled.node.shape, handle_list.as_deref());
        let shape = &compiled.node.shape;
        let matches_binding_rest = compiled.binding.as_ref().is_some_and(|binding| {
            let rest = &binding.rest.shape;
            // Composition always stores a rotation deformer's scale and reflection, so a rest
            // layout without them never matches.
            let rotation_matches = shape.deformer_type != Some(DeformerType::Rotation)
                || (rest.rotation_scale == Some(rotation.scale)
                    && rest.rotation_reflection == Some(rotation.reflection)
                    && rest.rotation_angle == rotation.angle);
            compiled.static_shape_matches_binding
                && rotation_matches
                && rotation.scale == 1.0
                && !rotation.reflection.iter().any(|flag| *flag)
                && rest.control_points == control_points
                && rest.curve_handles == handle_list
        });
        Self {
            bones: bone_segments(shape, &control_points, rotation.scale),
            compiled,
            control_points,
            handles,
            spatial,
            rotation,
            matches_binding_rest,
        }
    }

    fn layout(&self) -> Layout<'_> {
        Layout {
            shape: &self.compiled.node.shape,
            control_points: &self.control_points,
            handles: &self.handles,
            lookups: &self.compiled.lookups,
            bones: &self.bones,
            rotation_reflection: self.rotation.reflection,
        }
    }

    /// `transformDeformerPoint`.
    pub(crate) fn transform(&self, point: Vec2, vertex: Option<VertexKey>) -> Vec2 {
        let weight = self.compiled.lookups.influence(vertex);
        if weight == 0.0 {
            return point;
        }
        Vec2::lerp(point, self.transform_unweighted(point, vertex), weight)
    }

    fn transform_unweighted(&self, point: Vec2, vertex: Option<VertexKey>) -> Vec2 {
        let Some(binding) = &self.compiled.binding else {
            return self.layout().transform(point, vertex);
        };
        let preserved = binding.steps.iter().fold(point, |current, step| {
            apply_binding_step(
                &step.shape.layout(),
                step.rest.as_ref().map(StaticLayout::layout).as_ref(),
                current,
                vertex,
            )
        });
        if self.matches_binding_rest {
            preserved
        } else {
            apply_binding_step(
                &self.layout(),
                Some(&binding.rest.layout()),
                preserved,
                vertex,
            )
        }
    }
}

/// Maps a point placed against `rest` onto `shape`, keeping the inverse's residual.
fn apply_binding_step(
    shape: &Layout<'_>,
    rest: Option<&Layout<'_>>,
    point: Vec2,
    vertex: Option<VertexKey>,
) -> Vec2 {
    let Some(rest) = rest else {
        return shape.transform(point, vertex);
    };
    let local = invert(rest.shape, point, |p| rest.transform(p, vertex));
    let reference = rest.transform(local, vertex);
    let posed = shape.transform(local, vertex);
    Vec2::new(
        point.x + posed.x - reference.x,
        point.y + posed.y - reference.y,
    )
}

/// Newton iterations with finite-difference Jacobians (`invertPoint`).
fn invert(shape: &DeformerShape, target: Vec2, transform: impl Fn(Vec2) -> Vec2) -> Vec2 {
    const CONVERGENCE_RATIO: f64 = 0.001;
    let epsilon = shape.bounds.width.max(shape.bounds.height) * INVERSE_EPSILON_RATIO;
    let mut estimate = target;
    for _ in 0..INVERSE_ITERATIONS {
        let mapped = transform(estimate);
        if (mapped.x - target.x).hypot(mapped.y - target.y) < epsilon * CONVERGENCE_RATIO {
            return estimate;
        }
        let horizontal = transform(Vec2::new(estimate.x + epsilon, estimate.y));
        let vertical = transform(Vec2::new(estimate.x, estimate.y + epsilon));
        let (hx, hy) = (
            (horizontal.x - mapped.x) / epsilon,
            (horizontal.y - mapped.y) / epsilon,
        );
        let (vx, vy) = (
            (vertical.x - mapped.x) / epsilon,
            (vertical.y - mapped.y) / epsilon,
        );
        let determinant = hx * vy - vx * hy;
        if determinant.abs() > MINIMUM_DETERMINANT {
            let (ex, ey) = (mapped.x - target.x, mapped.y - target.y);
            estimate = Vec2::new(
                estimate.x - (vy * ex - vx * ey) / determinant,
                estimate.y - (-hy * ex + hx * ey) / determinant,
            );
        }
    }
    estimate
}
