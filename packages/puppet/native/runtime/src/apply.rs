//! Scene deformation of posed vertices (`vertices.ts`, `skinning.ts` frames, `glue.ts`).

use std::collections::HashMap;

use poffo_format::document::Glue;

use crate::deform::skin::{Matrix, blend_rigid};
use crate::deform::{PosedDeformer, VertexKey, is_rigid_rotation};
use crate::geometry::Vec2;
use crate::model::{CompiledSkin, Model, SceneTree};

/// Posed deformers indexed like `Model::deformers`.
pub(crate) struct PosedScene<'m> {
    pub(crate) deformers: Vec<std::rc::Rc<PosedDeformer<'m>>>,
}

impl Model {
    pub(crate) fn pose_scene(&self, values: &[f64]) -> PosedScene<'_> {
        let mut poses: HashMap<usize, std::rc::Rc<PosedDeformer<'_>>> = HashMap::new();
        PosedScene {
            deformers: (0..self.deformers.len())
                .map(|i| {
                    poses
                        .entry(self.coordinate_ids[i])
                        .or_insert_with(|| std::rc::Rc::new(self.pose_deformer(i, values)))
                        .clone()
                })
                .collect(),
        }
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
                    let deformer = &posed.deformers[*index];
                    if !is_rigid_rotation(&deformer.compiled.node) {
                        continue;
                    }
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
pub(crate) fn apply_scene_deformers(
    model: &Model,
    posed: &PosedScene<'_>,
    cache: &mut crate::geometry_cache::GeometryCache,
    vertices: &mut [Vec<f32>],
) {
    let active = cache.prepare(model, posed, vertices);
    let frames = skin_frames(model, posed);
    let identity: crate::deform::parent::Transform<'_> = std::rc::Rc::new(|point, _| point);
    let mut evaluation = SceneEvaluation {
        posed,
        frames: &frames,
        coordinate_ids: &model.coordinate_ids,
        transforms: HashMap::new(),
        active: &active,
    };
    apply_nodes(
        &model.scene,
        identity,
        None,
        false,
        &mut evaluation,
        vertices,
    );
    cache.record(&active, vertices);
}

struct SceneEvaluation<'a, 'm> {
    posed: &'a PosedScene<'m>,
    active: &'a [bool],
    frames: &'a HashMap<&'m str, Matrix>,
    coordinate_ids: &'a [usize],
    transforms: HashMap<usize, crate::deform::parent::Transform<'a>>,
}

fn apply_nodes<'a, 'm: 'a>(
    nodes: &[SceneTree],
    transform: crate::deform::parent::Transform<'a>,
    parent: Option<&'a PosedDeformer<'m>>,
    weighted: bool,
    evaluation: &mut SceneEvaluation<'a, 'm>,
    vertices: &mut [Vec<f32>],
) {
    for node in nodes {
        match node {
            SceneTree::Part {
                part: Some(part),
                skin,
                ..
            } => {
                if let Some(points) = vertices.get_mut(*part).filter(|_| evaluation.active[*part]) {
                    for (index, xy) in points.chunks_exact_mut(2).enumerate() {
                        let point = Vec2::new(f64::from(xy[0]), f64::from(xy[1]));
                        let point = skin
                            .as_ref()
                            .and_then(|skin| skin_matrix(evaluation.frames, skin, index))
                            .map_or_else(
                                || {
                                    transform(
                                        point,
                                        Some(VertexKey {
                                            part: *part,
                                            vertex: index,
                                        }),
                                    )
                                },
                                |matrix| matrix.transform(point),
                            );
                        xy[0] = point.x as f32;
                        xy[1] = point.y as f32;
                    }
                }
            }
            SceneTree::Part { part: None, .. } => {}

            SceneTree::Group { children, .. }
                if crate::geometry_cache::active_nodes(children, evaluation.active) =>
            {
                apply_nodes(
                    children,
                    std::rc::Rc::clone(&transform),
                    parent,
                    weighted,
                    evaluation,
                    vertices,
                )
            }
            SceneTree::Deformer {
                index, children, ..
            } if crate::geometry_cache::active_nodes(children, evaluation.active) => {
                let node = &evaluation.posed.deformers[*index];
                let next = evaluation
                    .transforms
                    .entry(evaluation.coordinate_ids[*index])
                    .or_insert_with(|| {
                        crate::deform::parent::compose(
                            node,
                            std::rc::Rc::clone(&transform),
                            parent,
                            weighted,
                        )
                    })
                    .clone();
                let weighted = weighted
                    || node.compiled.node.shape.bone_weights.is_some()
                    || node.compiled.node.shape.vertex_influences.is_some();
                apply_nodes(children, next, Some(node), weighted, evaluation, vertices);
            }
            SceneTree::Group { .. } | SceneTree::Deformer { .. } => {}
        }
    }
}

/// `applyGlue`: joins vertex pairs, or pulls vertices onto fixed edge positions.
pub(crate) fn apply_glue(model: &Model, glue: &[Glue], vertices: &mut [Vec<f32>]) {
    for connection in glue {
        let (Some(first), Some(second)) = (
            model.part_index(&connection.first.part_id),
            model.part_index(&connection.second.part_id),
        ) else {
            continue;
        };
        let first_offset = connection.first.vertex_index * 2;
        let second_offset = connection.second.vertex_index * 2;
        if first == second
            || first_offset + 1 >= vertices[first].len()
            || second_offset + 1 >= vertices[second].len()
        {
            continue;
        }
        for axis in 0..2 {
            let first_value = f64::from(vertices[first][first_offset + axis]);
            let second_value = match connection.second.edge {
                Some(edge) => {
                    let end = vertices[second]
                        .get(edge.end_index * 2 + axis)
                        .copied()
                        .map_or(0.0, f64::from);
                    f64::from(vertices[second][second_offset + axis]) * (1.0 - edge.position)
                        + end * edge.position
                }
                None => f64::from(vertices[second][second_offset + axis]),
            };
            let target = first_value * (1.0 - connection.weight) + second_value * connection.weight;
            vertices[first][first_offset + axis] =
                (first_value + (target - first_value) * connection.strength) as f32;
            if connection.second.edge.is_none() {
                vertices[second][second_offset + axis] =
                    (second_value + (target - second_value) * connection.strength) as f32;
            }
        }
    }
}
