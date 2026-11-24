//! Depth-first geometry steps with parent links and inactive subtree jumps.
use std::{collections::HashMap, rc::Rc, sync::Arc};

use super::{SceneEvaluation, skin_matrix};

use crate::deferred::DeferredGeometry;
use crate::deform::projection::Projection;
use crate::deform::skin::Matrix;
use crate::deform::{VertexKey, parent::Transform};
use crate::geometry::Vec2;
use crate::model::{CompiledSkin, SceneTree};

#[derive(Clone, Debug)]
pub(crate) enum Step {
    Deformer {
        index: usize,
        parent: Option<usize>,
        after: usize,
    },
    Part {
        index: usize,
        parent: Option<usize>,
        skin: Option<Arc<CompiledSkin>>,
    },
}

pub(crate) fn compile(nodes: &[SceneTree]) -> Vec<Step> {
    fn append(nodes: &[SceneTree], parent: Option<usize>, steps: &mut Vec<Step>) {
        for node in nodes {
            match node {
                SceneTree::Group { children, .. } => append(children, parent, steps),
                SceneTree::Deformer {
                    index, children, ..
                } => {
                    let position = steps.len();
                    steps.push(Step::Deformer {
                        index: *index,
                        parent,
                        after: 0,
                    });
                    append(children, Some(*index), steps);
                    let end = steps.len();
                    if let Step::Deformer { after, .. } = &mut steps[position] {
                        *after = end;
                    }
                }
                SceneTree::Part {
                    part: Some(index),
                    skin,
                    ..
                } => {
                    steps.push(Step::Part {
                        index: *index,
                        parent,
                        skin: skin.clone(),
                    });
                }
                SceneTree::Part { part: None, .. } => {}
            }
        }
    }

    let mut steps = Vec::new();
    append(nodes, None, &mut steps);
    steps
}

pub(super) fn apply<'a, 'm: 'a>(
    steps: &[Step],
    identity: &Transform<'a>,
    evaluation: &mut SceneEvaluation<'a, 'm>,
    vertices: &mut [Vec<f32>],
) {
    let mut weighted = vec![false; evaluation.active_deformers.len()];
    let mut cursor = 0;
    while let Some(step) = steps.get(cursor) {
        cursor += 1;
        match step {
            Step::Deformer {
                index,
                parent,
                after,
            } => {
                if !evaluation.active_deformers[*index] {
                    cursor = *after;
                    continue;
                }

                let parent_weighted = parent.is_some_and(|index| weighted[index]);
                let node = evaluation.posed.at(*index);
                let key = evaluation.coordinate_ids[*index];
                weighted[*index] = parent_weighted
                    || node.compiled.node.shape.bone_weights.is_some()
                    || node.compiled.node.shape.vertex_influences.is_some();
                if evaluation.transforms[key].is_some() {
                    continue;
                }

                let transform = parent
                    .and_then(|index| {
                        evaluation.transforms[evaluation.coordinate_ids[index]].as_ref()
                    })
                    .unwrap_or(identity);
                evaluation.transforms[key] = Some(crate::deform::parent::compose(
                    node,
                    Rc::clone(transform),
                    parent.map(|index| evaluation.posed.at(index)),
                    parent_weighted,
                    evaluation
                        .deferred
                        .as_ref()
                        .map(|_| &mut evaluation.projections[key]),
                ));
            }
            Step::Part {
                index,
                parent,
                skin,
            } => {
                let Some(points) = vertices
                    .get_mut(*index)
                    .filter(|_| evaluation.active[*index])
                else {
                    continue;
                };
                let key = parent.map(|index| evaluation.coordinate_ids[index]);
                let projection = key
                    .filter(|_| !parent.is_some_and(|index| weighted[index]))
                    .and_then(|key| evaluation.projections[key].as_ref());
                let transform = key
                    .and_then(|key| evaluation.transforms[key].as_ref())
                    .unwrap_or(identity);
                apply_part(
                    *index,
                    points,
                    skin.as_deref(),
                    evaluation.frames,
                    transform,
                    projection,
                    &mut evaluation.deferred,
                );
            }
        }
    }
}

#[inline]
pub(super) fn apply_part(
    part: usize,
    points: &mut [f32],
    skin: Option<&CompiledSkin>,
    frames: &HashMap<&str, Matrix>,
    transform: &Transform<'_>,
    projection: Option<&Rc<Projection>>,
    deferred: &mut Option<&mut DeferredGeometry>,
) {
    if skin.is_none()
        && projection.is_some_and(|projection| {
            deferred
                .as_mut()
                .is_some_and(|batch| batch.push(part, points, projection))
        })
    {
        return;
    }

    let apply_deformer = |point, vertex| transform(point, Some(VertexKey { part, vertex }));
    if let Some(skin) = skin {
        apply_vertices(points, |point, vertex| {
            skin_matrix(frames, skin, vertex).map_or_else(
                || apply_deformer(point, vertex),
                |matrix| matrix.transform(point),
            )
        });
    } else {
        apply_vertices(points, apply_deformer);
    }
}

fn apply_vertices(points: &mut [f32], apply: impl Fn(Vec2, usize) -> Vec2) {
    for (index, xy) in points.chunks_exact_mut(2).enumerate() {
        let point = apply(Vec2::new(f64::from(xy[0]), f64::from(xy[1])), index);
        xy[0] = point.x as f32;
        xy[1] = point.y as f32;
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn geometry_steps_keep_parent_order_and_skip_only_the_inactive_subtree() {
        let part = |index| SceneTree::Part {
            part: index,
            visible: true,
            skin: None,
        };
        let scene = [SceneTree::Group {
            visible: true,
            children: vec![
                SceneTree::Deformer {
                    index: 0,
                    visible: true,
                    children: vec![
                        part(Some(0)),
                        SceneTree::Deformer {
                            index: 1,
                            visible: true,
                            children: vec![part(None), part(Some(1))],
                        },
                    ],
                },
                part(Some(2)),
            ],
        }];
        let plan = compile(&scene);
        assert!(matches!(
            plan.as_slice(),
            [
                Step::Deformer {
                    index: 0,
                    parent: None,
                    after: 4
                },
                Step::Part {
                    index: 0,
                    parent: Some(0),
                    ..
                },
                Step::Deformer {
                    index: 1,
                    parent: Some(0),
                    after: 4
                },
                Step::Part {
                    index: 1,
                    parent: Some(1),
                    ..
                },
                Step::Part {
                    index: 2,
                    parent: None,
                    ..
                }
            ]
        ));

        // Inactive deformers do not read poses, and their descendants do not apply
        // their transforms, even if the next root part still needs an update.
        let posed =
            crate::apply::PosedScene::new(std::borrow::Cow::Borrowed(&[]), |_| unreachable!());
        let mut evaluation = SceneEvaluation {
            posed: &posed,
            deferred: None,
            projections: vec![],
            active: &[true, true, true],
            active_deformers: &[false, false],
            frames: &HashMap::new(),
            coordinate_ids: &[],
            transforms: vec![],
        };
        let root_transform: Transform<'_> = Rc::new(|point, vertex| {
            let Some(VertexKey { part: 2, vertex: 0 }) = vertex else {
                panic!("only the active root part should be transformed")
            };
            point + Vec2::new(1.0, 2.0)
        });
        let mut vertices = [vec![0.0, 1.0], vec![2.0, 3.0], vec![4.0, 5.0]];
        apply(&plan, &root_transform, &mut evaluation, &mut vertices);
        assert_eq!(vertices, [vec![0.0, 1.0], vec![2.0, 3.0], vec![5.0, 7.0]]);
    }
}
