//! Scene deformation of posed vertices (`vertices.ts`, `skinning.ts` frames, `glue.ts`).

mod steps;

pub(crate) use steps::{Step, compile as compile_steps};

use std::{borrow::Cow, cell::OnceCell, collections::HashMap};

use crate::deform::skin::{Matrix, blend_rigid};
use crate::deform::{PosedDeformer, is_rigid_rotation};
use crate::geometry::Vec2;
use crate::model::{CompiledSkin, GlueConnection, Model, SceneTree};

/// Posed deformers, resolved on demand and shared across canonical layouts.
pub(crate) struct PosedScene<'m> {
    indices: Cow<'m, [usize]>,
    slots: Vec<OnceCell<Box<PosedDeformer<'m>>>>,
    evaluate: Box<dyn Fn(usize) -> PosedDeformer<'m> + 'm>,
}
impl<'m> PosedScene<'m> {
    pub(crate) fn new(
        indices: Cow<'m, [usize]>,
        evaluate: impl Fn(usize) -> PosedDeformer<'m> + 'm,
    ) -> Self {
        let slots = (0..indices.len()).map(|_| OnceCell::new()).collect();
        Self {
            indices,
            slots,
            evaluate: Box::new(evaluate),
        }
    }
    pub(crate) fn at(&self, index: usize) -> &PosedDeformer<'m> {
        let canonical = self.indices[index];
        self.slots[canonical].get_or_init(|| Box::new((self.evaluate)(canonical)))
    }
    pub(crate) fn len(&self) -> usize {
        self.indices.len()
    }
}

#[cfg(test)]
impl Model {
    pub(crate) fn pose_scene<'a>(&'a self, values: &'a [f64]) -> PosedScene<'a> {
        let mut canonical = HashMap::new();
        let indices = self
            .coordinate_ids
            .iter()
            .enumerate()
            .map(|(index, &id)| *canonical.entry(id).or_insert(index))
            .collect();
        PosedScene::new(Cow::Owned(indices), |index| {
            self.pose_deformer(index, values)
        })
    }
}

/// Affine frames of rigid rotation deformers reachable through groups and rotations.
fn skin_frames<'m>(model: &'m Model, posed: &PosedScene<'m>) -> HashMap<&'m str, Matrix> {
    fn visit<'m>(
        nodes: &[SceneTree],
        parent: Matrix,
        model: &'m Model,
        posed: &PosedScene<'m>,
        out: &mut HashMap<&'m str, Matrix>,
    ) {
        for node in nodes {
            match node {
                SceneTree::Deformer {
                    index, children, ..
                } => {
                    let canonical = posed.indices[*index];
                    if !is_rigid_rotation(&model.deformers[canonical].node) {
                        continue;
                    }
                    let deformer = posed.at(*index);
                    let origin = deformer.transform(Vec2::ZERO, None);
                    let horizontal = deformer.transform(Vec2::new(1.0, 0.0), None);
                    let vertical = deformer.transform(Vec2::new(0.0, 1.0), None);
                    let matrix = parent.multiply(&Matrix {
                        xx: horizontal.x - origin.x,
                        xy: vertical.x - origin.x,
                        yx: horizontal.y - origin.y,
                        yy: vertical.y - origin.y,
                        x: origin.x,
                        y: origin.y,
                    });
                    out.insert(model.deformers[*index].node.id.as_str(), matrix);
                    visit(children, matrix, model, posed, out);
                }
                SceneTree::Group { children, .. } => visit(children, parent, model, posed, out),
                SceneTree::Part { .. } => {}
            }
        }
    }
    let mut frames = HashMap::new();
    visit(&model.scene, Matrix::IDENTITY, model, posed, &mut frames);
    frames
}

/// `blendSkinMatrix` for one vertex.
fn skin_matrix(
    frames: &HashMap<&str, Matrix>,
    skin: &CompiledSkin,
    vertex: usize,
) -> Option<Matrix> {
    let transforms: Vec<(Matrix, f64)> = skin
        .influences
        .iter()
        .filter_map(|(id, inverse_bind, weights)| {
            let weight = weights.get(vertex).copied().unwrap_or(0.0);
            let frame = frames.get(id.as_str()).filter(|_| weight > 0.0)?;
            Some((frame.multiply(inverse_bind).multiply(&skin.bind), weight))
        })
        .collect();
    blend_rigid(&transforms)
}

/// Applies every ancestor deformer (innermost first) and skinning to part vertices, in place.
pub(crate) fn apply_scene_deformers<'m>(
    model: &'m Model,
    posed: &PosedScene<'m>,
    cache: &mut crate::geometry_cache::GeometryCache,
    vertices: &mut [Vec<f32>],
    required: Option<&[bool]>,
) {
    apply_scene_geometry(model, posed, cache, vertices, None, required);
}

pub(crate) fn apply_scene_geometry<'m>(
    model: &'m Model,
    posed: &PosedScene<'m>,
    cache: &mut crate::geometry_cache::GeometryCache,
    vertices: &mut [Vec<f32>],
    mut deferred: Option<&mut crate::deferred::DeferredGeometry>,
    required: Option<&[bool]>,
) {
    if let Some(batch) = &mut deferred {
        batch.begin(model.parts.iter().map(|part| part.rest.len()));
    }
    {
        let prepared = cache.prepare(model, posed, vertices, required);
        let frames = if model.uses_skinning {
            skin_frames(model, posed)
        } else {
            HashMap::new()
        };
        let identity: crate::deform::parent::Transform<'_> = std::rc::Rc::new(|point, _| point);
        let coordinate_count = model.coordinate_ids.iter().max().map_or(0, |id| id + 1);
        let mut evaluation = SceneEvaluation {
            posed,
            frames: &frames,
            coordinate_ids: &model.coordinate_ids,
            transforms: vec![None; coordinate_count],
            projections: vec![None; coordinate_count],
            deferred,
            active: prepared.active,
            active_deformers: prepared.deformers,
        };
        steps::apply(&model.geometry_steps, &identity, &mut evaluation, vertices);
    }
    cache.record(model, vertices);
}

struct SceneEvaluation<'a, 'm> {
    posed: &'a PosedScene<'m>,
    deferred: Option<&'a mut crate::deferred::DeferredGeometry>,
    projections: Vec<Option<std::rc::Rc<crate::deform::projection::Projection>>>,
    active: &'a [bool],
    active_deformers: &'a [bool],
    frames: &'a HashMap<&'m str, Matrix>,
    coordinate_ids: &'a [usize],
    transforms: Vec<Option<crate::deform::parent::Transform<'a>>>,
}

fn glue_anchor(
    vertices: &[f32],
    offset: usize,
    edge: Option<poffo_format::document::GlueEdge>,
) -> [f64; 2] {
    std::array::from_fn(|axis| match edge {
        Some(edge) => {
            f64::from(vertices[offset + axis]) * (1.0 - edge.position)
                + f64::from(vertices[edge.end_index * 2 + axis]) * edge.position
        }
        None => f64::from(vertices[offset + axis]),
    })
}

fn rotate_glue_coordinates(vertices: &mut [f32], pivot: [f64; 2], angle: f64) {
    if angle == 0.0 {
        return;
    }
    let cosine = angle.cos();
    let sine = angle.sin();
    for point in vertices.chunks_exact_mut(2) {
        let x = f64::from(point[0]) - pivot[0];
        let y = f64::from(point[1]) - pivot[1];
        point[0] = (pivot[0] + x * cosine - y * sine) as f32;
        point[1] = (pivot[1] + x * sine + y * cosine) as f32;
    }
}

fn align_glue_rotation(connection: &GlueConnection, first: &mut [f32], second: &mut [f32]) {
    use poffo_format::document::GlueMode;

    let Some(rotation) = connection
        .rotation
        .filter(|_| connection.mode == Some(GlueMode::Rigid))
    else {
        return;
    };
    let first_anchor = glue_anchor(first, connection.first_offset, None);
    let second_anchor = glue_anchor(second, connection.second_offset, connection.edge);
    let first_x = f64::from(first[rotation.first * 2]) - first_anchor[0];
    let first_y = f64::from(first[rotation.first * 2 + 1]) - first_anchor[1];
    let second_x = f64::from(second[rotation.second * 2]) - second_anchor[0];
    let second_y = f64::from(second[rotation.second * 2 + 1]) - second_anchor[1];
    if first_x.hypot(first_y) > 0.000001 && second_x.hypot(second_y) > 0.000001 {
        let angle = (first_x * second_y - first_y * second_x)
            .atan2(first_x * second_x + first_y * second_y);
        rotate_glue_coordinates(
            first,
            first_anchor,
            angle * connection.weight * connection.strength,
        );
        if connection.edge.is_none() {
            rotate_glue_coordinates(
                second,
                second_anchor,
                -angle * (1.0 - connection.weight) * connection.strength,
            );
        }
    }
}

fn move_glue_coordinates(
    vertices: &mut [f32],
    axis: usize,
    displacement: f64,
    offset: Option<usize>,
) {
    match offset {
        Some(offset) => {
            vertices[offset + axis] = (f64::from(vertices[offset + axis]) + displacement) as f32
        }
        None => {
            for index in (axis..vertices.len()).step_by(2) {
                vertices[index] = (f64::from(vertices[index]) + displacement) as f32;
            }
        }
    }
}

/// `applyGlue`: joins anchors after optional whole-part rotation and translation.
pub(crate) fn apply_glue<I, T>(glue: I, vertices: &mut [T])
where
    I: IntoIterator,
    I::Item: std::borrow::Borrow<GlueConnection>,
    T: AsMut<[f32]>,
{
    use poffo_format::document::GlueMode;
    use std::borrow::Borrow;

    for connection in glue {
        let connection = connection.borrow();
        let first_index = connection.first_part;
        let second_index = connection.second_part;
        if first_index == second_index {
            continue;
        }
        let (first, second) = if first_index < second_index {
            let (before, after) = vertices.split_at_mut(second_index);
            (&mut before[first_index], &mut after[0])
        } else {
            let (before, after) = vertices.split_at_mut(first_index);
            (&mut after[0], &mut before[second_index])
        };
        let (first, second) = (first.as_mut(), second.as_mut());
        if connection.first_offset + 1 >= first.len()
            || connection.second_offset + 1 >= second.len()
        {
            continue;
        }
        align_glue_rotation(connection, first, second);
        let vertex_only = connection.mode.is_none_or(|mode| mode == GlueMode::Vertex);
        let first_anchor = glue_anchor(first, connection.first_offset, None);
        let second_anchor = glue_anchor(second, connection.second_offset, connection.edge);
        for axis in 0..2 {
            let first_value = first_anchor[axis];
            let second_value = second_anchor[axis];
            let target = first_value * (1.0 - connection.weight) + second_value * connection.weight;
            move_glue_coordinates(
                first,
                axis,
                (target - first_value) * connection.strength,
                vertex_only.then_some(connection.first_offset),
            );
            if connection.edge.is_none() {
                move_glue_coordinates(
                    second,
                    axis,
                    (target - second_value) * connection.strength,
                    vertex_only.then_some(connection.second_offset),
                );
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::rc::Rc;
    #[test]
    fn skinned_parts_keep_cpu_evaluation_under_a_gpu_eligible_parent() {
        let skin = CompiledSkin {
            bind: Matrix::IDENTITY,
            influences: vec![("bone".into(), Matrix::IDENTITY, vec![1.])],
        };
        let frames = HashMap::from([(
            "bone",
            Matrix {
                x: 7.,
                y: 9.,
                ..Matrix::IDENTITY
            },
        )]);
        let projection = Rc::new(crate::deform::projection::Projection {
            kind: 1,
            values: vec![0., 0., 0., 0., 1., 0., 1., 1., 0., 0., 0., 0., 1., 0.],
        });
        let mut batch = crate::deferred::DeferredGeometry::default();
        batch.begin([2].into_iter());
        let mut vertices = [1., 2.];
        let mut deferred = Some(&mut batch);
        let identity: crate::deform::parent::Transform<'_> = Rc::new(|point, _| point);
        steps::apply_part(
            0,
            &mut vertices,
            Some(&skin),
            &frames,
            &identity,
            Some(&projection),
            &mut deferred,
        );
        assert_eq!(vertices, [8., 11.]);
        assert!(batch.jobs.is_empty());
    }
}
