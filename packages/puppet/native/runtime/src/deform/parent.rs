//! Composed transforms for parent-local layouts; common unweighted layouts are prepared once.
use super::{PosedDeformer, VertexKey};
use crate::geometry::Vec2;
use poffo_format::document::{CurveHandle, DeformerType, Point};
use std::rc::Rc;

pub(crate) type Transform<'a> = Rc<dyn Fn(Vec2, Option<VertexKey>) -> Vec2 + 'a>;

pub(crate) fn projection(
    node: &PosedDeformer<'_>,
    parent: &Transform<'_>,
    parent_node: Option<&PosedDeformer<'_>>,
    weighted: bool,
    frame: Option<(Vec2, Vec2, f64, f64)>,
) -> Option<super::projection::Projection> {
    use super::projection::Projection;
    use poffo_format::document::DeformerInterpolation;
    let shape = &node.compiled.node.shape;
    if weighted
        || shape.coordinate_space.is_none()
        || node.compiled.binding.is_some()
        || shape.pins.is_some()
    {
        return None;
    }
    if shape.deformer_type == Some(DeformerType::Rotation) {
        let [bone] = node.bones.as_slice() else {
            return None;
        };
        let inherited = parent_node
            .is_some_and(|p| p.compiled.node.shape.deformer_type == Some(DeformerType::Rotation));
        let (origin, world, cosine, sine) =
            frame.unwrap_or_else(|| rotation_frame(node, parent, inherited, None));
        let mut values = bone.projection().to_vec();
        values.extend(
            node.rotation
                .reflection
                .map(|flip| if flip { -1. } else { 1. }),
        );
        values.extend([origin.x, origin.y, world.x, world.y, cosine, sine]);
        return Some(Projection { kind: 1, values });
    }
    if shape.columns != 1 || shape.rows != 1 || node.control_points.len() != 8 {
        return None;
    }
    let kind = match node.compiled.grid_interpolation()? {
        DeformerInterpolation::Bilinear => 2,
        DeformerInterpolation::Triangles => 3,
        DeformerInterpolation::TrianglesMirrored => 4,
    };
    let bounds = shape.bounds;
    let mut values = vec![bounds.x, bounds.y, bounds.width, bounds.height];
    for xy in node.control_points.chunks_exact(2) {
        let point = parent(Vec2::new(xy[0], xy[1]), None);
        values.extend([point.x, point.y]);
    }
    Some(Projection { kind, values })
}

fn parent_warp<'m>(
    node: &PosedDeformer<'m>,
    parent: &Transform<'_>,
    vertex: Option<VertexKey>,
) -> PosedDeformer<'m> {
    let points = node
        .control_points
        .chunks_exact(2)
        .flat_map(|xy| {
            let world = parent(Vec2::new(xy[0], xy[1]), vertex);
            [world.x, world.y]
        })
        .collect();
    let handles = node.compiled.node.shape.curve_handles.as_ref().map(|_| {
        node.handles
            .iter()
            .flatten()
            .map(|handle| {
                let map = |p: Point| {
                    let world = parent(Vec2::new(p.x, p.y), vertex);
                    Point {
                        x: world.x,
                        y: world.y,
                    }
                };
                CurveHandle {
                    point_index: handle.point_index,
                    horizontal: map(handle.horizontal),
                    vertical: map(handle.vertical),
                }
            })
            .collect()
    });
    PosedDeformer::new(node.compiled, points, handles, node.spatial, node.rotation)
}

/// Local distance along -Y used to derive a parent-space rotation frame when not overridden.
const ROTATION_REFERENCE_DISTANCE: f64 = 0.1;

/// The node's pivot, its parent-mapped position, and the parent frame's rotation and scale as
/// `(cosine, sine)` (`createParentSpaceTransform`). The node's own mapping ignores vertex
/// identity; only `parent` may depend on it.
fn rotation_frame(
    node: &PosedDeformer<'_>,
    parent: &Transform<'_>,
    inherited: bool,
    vertex: Option<VertexKey>,
) -> (Vec2, Vec2, f64, f64) {
    let origin = node.transform(Vec2::ZERO, None);
    let world = parent(origin, vertex);
    let distance = node
        .compiled
        .node
        .shape
        .rotation_reference_distance
        .unwrap_or(ROTATION_REFERENCE_DISTANCE);
    let reference = parent(Vec2::new(origin.x, origin.y - distance), vertex);
    // A negative distance samples below the pivot; the sign keeps the frame pointing up.
    let sign = signum(distance);
    let angle = ((world.y - reference.y) * sign).atan2((world.x - reference.x) * sign)
        - std::f64::consts::FRAC_PI_2;
    let scale = if inherited {
        (world - reference).length() / distance.abs()
    } else {
        1.0
    };
    (origin, world, angle.cos() * scale, angle.sin() * scale)
}

/// `Math.sign`: zero (and NaN) stay as they are.
fn signum(value: f64) -> f64 {
    if value == 0.0 || value.is_nan() {
        value
    } else {
        value.signum()
    }
}

fn rotate(node: &PosedDeformer<'_>, point: Vec2, frame: (Vec2, Vec2, f64, f64)) -> Vec2 {
    let (origin, world, cosine, sine) = frame;
    let local = node.transform(point, None) - origin;
    Vec2::new(
        world.x + local.x * cosine - local.y * sine,
        world.y + local.x * sine + local.y * cosine,
    )
}

pub(crate) fn compose<'a, 'm: 'a>(
    node: &'a PosedDeformer<'m>,
    parent: Transform<'a>,
    parent_node: Option<&PosedDeformer<'_>>,
    weighted: bool,
    output: Option<&mut Option<Rc<super::projection::Projection>>>,
) -> Transform<'a> {
    if node.compiled.node.shape.coordinate_space.is_none() {
        return Rc::new(move |point, vertex| parent(node.transform(point, vertex), vertex));
    }
    if node.compiled.node.shape.deformer_type == Some(DeformerType::Rotation) {
        let inherited = parent_node
            .is_some_and(|n| n.compiled.node.shape.deformer_type == Some(DeformerType::Rotation));
        if weighted {
            return Rc::new(move |point, vertex| {
                rotate(
                    node,
                    point,
                    rotation_frame(node, &parent, inherited, vertex),
                )
            });
        }
        let frame = rotation_frame(node, &parent, inherited, None);
        if let Some(output) = output {
            *output = projection(node, &parent, parent_node, weighted, Some(frame)).map(Rc::new);
        }
        return Rc::new(move |point, _| rotate(node, point, frame));
    }
    if weighted {
        let shape = &node.compiled.node.shape;
        if let Some(interpolation) = shape.interpolation.filter(|_| {
            node.compiled.binding.is_none()
                && shape.pins.is_none()
                && shape.bone_rest_points.is_none()
                && shape.curve_axis.is_none()
        }) {
            // One vertex is evaluated to completion before the next. Epochs retain only the
            // requested parent-mapped corners and avoid clearing a whole grid per vertex.
            let previous = std::cell::Cell::new(None);
            let generation = std::cell::Cell::new(0_u64);
            let corners =
                vec![std::cell::Cell::new((0_u64, Vec2::ZERO)); node.control_points.len() / 2];
            return Rc::new(move |point, vertex| {
                if generation.get() == 0 || previous.get() != vertex {
                    previous.set(vertex);
                    generation.set(generation.get() + 1);
                }
                let epoch = generation.get();
                let sample = |index: usize| {
                    let cached = corners[index].get();
                    if cached.0 == epoch {
                        return cached.1;
                    }
                    let source = Vec2::new(
                        node.control_points.at(index * 2),
                        node.control_points.at(index * 2 + 1),
                    );
                    let mapped = parent(source, vertex);
                    corners[index].set((epoch, mapped));
                    mapped
                };
                super::warp_grid::sample_points(shape, point, interpolation, sample)
            });
        }
        return Rc::new(move |point, vertex| {
            parent_warp(node, &parent, vertex).transform(point, None)
        });
    }
    if let Some(interpolation) = node.compiled.grid_interpolation() {
        if let Some(output) = output {
            *output = projection(node, &parent, parent_node, weighted, None).map(Rc::new);
            if let Some(prepared) = output.as_ref().cloned() {
                // The GPU projection already holds the four mapped corners.
                return Rc::new(move |point, _| {
                    let mapped = super::warp_grid::sample_points(
                        &node.compiled.node.shape,
                        point,
                        interpolation,
                        |index| {
                            let offset = 4 + index * 2;
                            Vec2::new(prepared.values[offset], prepared.values[offset + 1])
                        },
                    );
                    Vec2::lerp(point, mapped, 1.0)
                });
            }
        }
        let corners = vec![std::cell::Cell::new(None); node.control_points.len() / 2];
        return Rc::new(move |point, _| {
            let sample = |index: usize| {
                if let Some(point) = corners[index].get() {
                    return point;
                }
                let point = parent(
                    Vec2::new(
                        node.control_points.at(index * 2),
                        node.control_points.at(index * 2 + 1),
                    ),
                    None,
                );
                corners[index].set(Some(point));
                point
            };
            let mapped = super::warp_grid::sample_points(
                &node.compiled.node.shape,
                point,
                interpolation,
                sample,
            );
            // Preserve transform()'s final interpolation, including its f64 rounding.
            Vec2::lerp(point, mapped, 1.0)
        });
    }
    let world = parent_warp(node, &parent, None);
    // Parent-local nodes use geometric weights; vertex identity belongs to ancestors.
    Rc::new(move |point, _| world.transform(point, None))
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::deform::{CompiledDeformer, RotationPose};
    use poffo_format::document::{DeformerInterpolation, DeformerNode};
    use serde_json::json;
    use std::cell::Cell;

    #[test]
    fn gpu_and_cpu_grids_reuse_mapped_corners_inside_and_outside() {
        let points = vec![0., 0., 1.1, 0.17, 0.42, 1., 1.38, 1.4];
        for interpolation in ["bilinear", "triangles", "triangles-mirrored"] {
            let node: DeformerNode = serde_json::from_value(json!({
                "id":"warp","kind":"deformer","name":"Warp","visible":true,"locked":false,
                "bounds":{"x":0,"y":0,"width":1,"height":1},"columns":1,"rows":1,
                "coordinateSpace":"parent","controlPoints":points,"interpolation":interpolation,
                "children":[]
            }))
            .unwrap();
            let compiled = CompiledDeformer::new(&node, &|_| None);
            let posed = PosedDeformer::new(
                &compiled,
                points.clone(),
                None,
                None,
                RotationPose {
                    scale: 1.0,
                    reflection: [false; 2],
                    angle: None,
                },
            );
            let calls = Cell::new(0);
            let parent: Transform<'_> = Rc::new(|p, _| {
                calls.set(calls.get() + 1);
                Vec2::new(p.x + p.y * p.y * 0.31, p.y - p.x * 0.17)
            });
            let reference = compose(&posed, Rc::clone(&parent), None, false, None);
            let mut projection = None;
            let shared = compose(&posed, parent, None, false, Some(&mut projection));
            assert!(projection.is_some());
            assert_eq!(calls.get(), 4);
            let samples = [
                Vec2::new(-0.23, 0.79),
                Vec2::new(0.6, 0.21),
                Vec2::new(1.0, 1.0),
                Vec2::new(2.3, -0.41),
            ];
            for point in samples {
                let expected = reference(point, None);
                let before_shared = calls.get();
                let actual = shared(point, None);
                assert_eq!(calls.get(), before_shared);
                assert_eq!(
                    [actual.x.to_bits(), actual.y.to_bits()],
                    [expected.x.to_bits(), expected.y.to_bits()],
                );
            }
        }
    }

    #[test]
    fn weighted_corners_reuse_one_vertex_and_invalidate_when_identity_changes() {
        let points: Vec<_> = (0..=4)
            .flat_map(|y| (0..=4).flat_map(move |x| [f64::from(x) / 4.0, f64::from(y) / 4.0]))
            .collect();
        let node: DeformerNode = serde_json::from_value(json!({"id":"warp","kind":"deformer","name":"Warp","visible":true,"locked":false,"bounds":{"x":0,"y":0,"width":1,"height":1},"columns":4,"rows":4,"coordinateSpace":"parent","controlPoints":points,"interpolation":"bilinear","children":[]})).unwrap();
        let compiled = CompiledDeformer::new(&node, &|_| None);
        let posed = PosedDeformer::new(
            &compiled,
            points,
            None,
            None,
            RotationPose {
                scale: 1.0,
                reflection: [false; 2],
                angle: None,
            },
        );
        let calls = Cell::new(0);
        let parent: Transform<'_> = Rc::new(|p, vertex| {
            calls.set(calls.get() + 1);
            let weight = vertex.map_or(1.0, |v| v.vertex as f64 * 0.17);
            Vec2::new(p.x + p.y * p.y * weight, p.y - p.x * weight)
        });
        let lazy = compose(&posed, Rc::clone(&parent), None, true, None);
        let point = Vec2::new(0.13, 0.19);
        let keys = [
            Some(VertexKey { part: 0, vertex: 1 }),
            Some(VertexKey { part: 0, vertex: 1 }),
            Some(VertexKey { part: 0, vertex: 2 }),
            Some(VertexKey { part: 0, vertex: 1 }),
            None,
            None,
        ];
        for (index, key) in keys.into_iter().enumerate() {
            let expected = parent_warp(&posed, &parent, key)
                .layout()
                .transform(point, None);
            calls.set(0);
            let actual = lazy(point, key);
            assert_eq!(
                [actual.x.to_bits(), actual.y.to_bits()],
                [expected.x.to_bits(), expected.y.to_bits()]
            );
            assert_eq!(calls.get(), if index == 1 || index == 5 { 0 } else { 4 });
        }
    }

    #[test]
    fn lazy_parent_corners_match_dense_warps_inside_and_outside_each_grid() {
        for interpolation in [
            DeformerInterpolation::Bilinear,
            DeformerInterpolation::Triangles,
            DeformerInterpolation::TrianglesMirrored,
        ] {
            let points: Vec<_> = (0..=4)
                .flat_map(|y| {
                    (0..=4).flat_map(move |x| {
                        [
                            f64::from(x) / 4.0 + f64::from(y) * 0.017,
                            f64::from(y) / 4.0,
                        ]
                    })
                })
                .collect();
            let node: DeformerNode = serde_json::from_value(json!({"id":"warp","kind":"deformer","name":"Warp","visible":true,"locked":false,"bounds":{"x":0,"y":0,"width":1,"height":1},"columns":4,"rows":4,"coordinateSpace":"parent","controlPoints":points,"children":[]})).unwrap();
            let mut compiled = CompiledDeformer::new(&node, &|_| None);
            compiled.node.shape.interpolation = Some(interpolation);
            let posed = PosedDeformer::new(
                &compiled,
                points,
                None,
                None,
                RotationPose {
                    scale: 1.0,
                    reflection: [false; 2],
                    angle: None,
                },
            );
            let count = Cell::new(0);
            let parent: Transform<'_> = Rc::new(|p, _| {
                count.set(count.get() + 1);
                Vec2::new(p.x + p.y * p.y * 0.31, p.y - p.x * 0.23)
            });
            let dense = parent_warp(&posed, &parent, None);
            count.set(0);
            let lazy = compose(&posed, Rc::clone(&parent), None, false, None);
            let first = Vec2::new(0.13, 0.19);
            assert_eq!(lazy(first, None), dense.transform(first, None));
            let sampled = match interpolation {
                DeformerInterpolation::Bilinear => 4,
                _ => 3,
            };
            assert_eq!(count.get(), sampled);
            lazy(first, None);
            assert_eq!(count.get(), sampled);
            for point in [
                Vec2::new(-0.71, -0.19),
                Vec2::new(1.75, 1.23),
                Vec2::new(0.71, 0.69),
            ] {
                let actual = lazy(point, None);
                let expected = dense.transform(point, None);
                assert_eq!(
                    [actual.x.to_bits(), actual.y.to_bits()],
                    [expected.x.to_bits(), expected.y.to_bits()]
                );
            }
        }
    }
}
