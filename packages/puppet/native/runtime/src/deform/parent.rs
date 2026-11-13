//! Composed transforms for parent-local layouts; common unweighted layouts are prepared once.
use super::{PosedDeformer, VertexKey};
use crate::geometry::Vec2;
use poffo_format::document::{CurveHandle, DeformerType, Point};
use std::rc::Rc;

pub(crate) type Transform<'a> = Rc<dyn Fn(Vec2, Option<VertexKey>) -> Vec2 + 'a>;

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
            let cache = std::cell::RefCell::new((
                None,
                0_u64,
                vec![(0_u64, Vec2::ZERO); node.control_points.len() / 2],
            ));
            return Rc::new(move |point, vertex| {
                let sample = |coordinate: usize| {
                    let index = coordinate / 2;
                    let mut cache = cache.borrow_mut();
                    if cache.1 == 0 || cache.0 != vertex {
                        cache.0 = vertex;
                        cache.1 += 1;
                    }
                    let epoch = cache.1;
                    if cache.2[index].0 != epoch {
                        let source = Vec2::new(
                            node.control_points[index * 2],
                            node.control_points[index * 2 + 1],
                        );
                        cache.2[index] = (epoch, parent(source, vertex));
                    }
                    let value = cache.2[index].1;
                    if coordinate.is_multiple_of(2) {
                        value.x
                    } else {
                        value.y
                    }
                };
                super::warp_grid::sample_coordinates(shape, point, interpolation, sample)
            });
        }
        return Rc::new(move |point, vertex| {
            parent_warp(node, &parent, vertex).transform(point, None)
        });
    }
    let world = parent_warp(node, &parent, None);
    // Parent-local nodes use geometric weights; vertex identity belongs to ancestors.
    Rc::new(move |point, _| world.transform(point, None))
}
