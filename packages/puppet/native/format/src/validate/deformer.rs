//! Deformer shape rules (`player/internal/parse-deformer.ts`).

use std::collections::HashSet;

use super::{Check, Effect, ensure, is_ratio};
use crate::document::{
    CurveHandle, DeformerNode, DeformerShape, DeformerType, ParameterDeformerKeyform, SpatialMesh,
};

const BONE_MIN_LENGTH: f64 = 0.001;

fn curve_handles_ok(handles: &[CurveHandle], point_count: Option<u64>) -> bool {
    let mut seen = HashSet::new();
    handles.iter().all(|h| seen.insert(h.point_index))
        && point_count.is_none_or(|count| {
            handles
                .iter()
                .all(|h| u64::try_from(h.point_index).is_ok_and(|i| i < count))
        })
}

fn curve_ok(shape: &DeformerShape) -> bool {
    let Some(_) = shape.curve_axis else {
        return shape.curve_breaks.is_none();
    };
    let points = shape.control_points.len() as f64 / 2.0 - 1.0;
    let segments = points / 3.0;
    if segments.fract() != 0.0 || segments < 1.0 {
        return false;
    }
    let structure = shape.columns == 1 && shape.rows == 1 && shape.curve_handles.is_none();
    let breaks_ok = match &shape.curve_breaks {
        None => segments == 1.0,
        Some(breaks) => {
            breaks.len() as f64 == segments + 1.0
                && breaks.first() == Some(&0.0)
                && breaks.last() == Some(&1.0)
                && breaks.windows(2).all(|pair| pair[1] > pair[0])
        }
    };
    structure && breaks_ok
}

fn bones_ok(shape: &DeformerShape) -> bool {
    let Some(points) = &shape.bone_rest_points else {
        return true;
    };
    let segments_long_enough = points
        .chunks_exact(2)
        .collect::<Vec<_>>()
        .windows(2)
        .all(|pair| (pair[1][0] - pair[0][0]).hypot(pair[1][1] - pair[0][1]) >= BONE_MIN_LENGTH);
    (4..=66).contains(&points.len())
        && points.len() % 2 == 0
        && shape.control_points.len() == points.len()
        && shape.curve_axis.is_none()
        && shape.curve_handles.is_none()
        && shape.columns == 1
        && shape.rows == 1
        && segments_long_enough
}

fn pins_ok(shape: &DeformerShape) -> bool {
    let Some(pins) = &shape.pins else {
        return true;
    };
    !pins.is_empty()
        && shape.bone_rest_points.is_none()
        && shape.curve_axis.is_none()
        && shape.curve_handles.is_none()
        && shape.columns == 1
        && shape.rows == 1
        && shape.control_points.len() == pins.len() * 2
        && pins.iter().all(|p| p.radius > 0.0 && is_ratio(p.strength))
}

fn weights_ok(shape: &DeformerShape) -> bool {
    let Some(entries) = &shape.bone_weights else {
        return true;
    };
    let Some(points) = &shape.bone_rest_points else {
        return false;
    };
    let Some(segments) = (points.len() / 2).checked_sub(1) else {
        return false;
    };
    let mut keys = HashSet::new();
    entries.iter().all(|entry| {
        let sum: f64 = entry.weights.iter().sum();
        !entry.part_id.is_empty()
            && entry.weights.len() == segments
            && entry.weights.iter().all(|&w| is_ratio(w))
            && (entry.weights.len() <= 1 || (sum - 1.0).abs() <= 0.000001)
            && keys.insert((entry.part_id.as_str(), entry.vertex_index))
    })
}

fn influences_ok(shape: &DeformerShape) -> bool {
    let Some(entries) = &shape.vertex_influences else {
        return true;
    };
    let mut keys = HashSet::new();
    entries.iter().all(|entry| {
        !entry.part_id.is_empty()
            && is_ratio(entry.weight)
            && keys.insert((entry.part_id.as_str(), entry.vertex_index))
    })
}

fn rotation_ok(shape: &DeformerShape, spatial_ok: bool) -> bool {
    match shape.deformer_type {
        None => true,
        Some(DeformerType::Spatial) => {
            spatial_ok && shape.bone_rest_points.is_none() && shape.pins.is_none()
        }
        Some(DeformerType::Rotation) => {
            shape
                .bone_rest_points
                .as_ref()
                .is_some_and(|p| p.len() == 4)
                && shape.bone_weights.is_none()
                && shape.vertex_influences.is_none()
                && shape.pins.is_none()
        }
    }
}

/// `isDeformerShape`; `spatial_ok` carries the node-level spatial field checks.
fn shape_ok(shape: &DeformerShape, spatial_ok: bool) -> bool {
    let bounds = shape.bounds;
    let rotation = shape.deformer_type == Some(DeformerType::Rotation);
    // `hasCoordinateOptions`: rotation fields need a rotation deformer; a zero reference distance
    // would divide the parent frame's scale by zero.
    let rotation_field = |value: Option<f64>, valid: fn(f64) -> bool| {
        value.is_none_or(|v| rotation && v.is_finite() && valid(v))
    };
    if !rotation_ok(shape, spatial_ok)
        || !rotation_field(shape.rotation_angle, |_| true)
        || !rotation_field(shape.rotation_reference_distance, |d| d != 0.0)
        || !rotation_field(shape.rotation_scale, |s| s >= 0.0)
        || (shape.rotation_reflection.is_some() && !rotation)
        || bounds.width <= 0.0
        || bounds.height <= 0.0
        || shape.columns == 0
        || shape.rows == 0
        || !curve_ok(shape)
        || !bones_ok(shape)
        || !pins_ok(shape)
        || !weights_ok(shape)
        || !influences_ok(shape)
    {
        return false;
    }
    // Checked: `u32::MAX` columns and rows overflow the coordinate count, which must reject
    // the grid rather than wrap to a small count.
    let Some(point_count) = (u64::from(shape.columns) + 1).checked_mul(u64::from(shape.rows) + 1)
    else {
        return false;
    };
    let grid_layout = shape.pins.is_some()
        || shape.bone_rest_points.is_some()
        || shape.curve_axis.is_some()
        || point_count.checked_mul(2).is_some_and(|coordinates| {
            u64::try_from(shape.control_points.len()) == Ok(coordinates)
        });
    grid_layout
        && curve_handles_ok(
            shape.curve_handles.as_deref().unwrap_or_default(),
            Some(point_count),
        )
}

fn spatial_mesh_ok(mesh: &SpatialMesh) -> bool {
    let vertex_count = mesh.vertices.len() / 3;
    !mesh.vertices.is_empty()
        && mesh.vertices.len().is_multiple_of(3)
        && !mesh.indices.is_empty()
        && mesh.indices.len().is_multiple_of(3)
        && mesh.indices.iter().all(|&i| (i as usize) < vertex_count)
}

pub(super) fn validate_node(node: &DeformerNode, path: &str) -> Check {
    ensure(
        node.properties
            .as_ref()
            .is_none_or(|p| Effect::from(p).ok(false)),
        || format!("{path}.properties"),
        "opacity and color channels must be 0..=1",
    )?;
    let spatial_ok = node.spatial_origin.is_some()
        && node
            .spatial_scale
            .is_none_or(|s| s.iter().all(|&v| v > 0.0))
        && node.spatial_mesh.as_ref().is_none_or(spatial_mesh_ok);
    ensure(
        shape_ok(&node.shape, spatial_ok),
        || path.to_owned(),
        "invalid deformer shape",
    )?;
    if let Some(binding) = &node.binding {
        let steps_ok = !binding.steps.is_empty()
            && binding.steps.iter().all(|step| {
                shape_ok(&step.shape, false)
                    && step.rest.as_ref().is_none_or(|rest| shape_ok(rest, false))
            });
        ensure(
            shape_ok(&binding.rest, false) && steps_ok,
            || format!("{path}.binding"),
            "invalid binding layout",
        )?;
    }
    Ok(())
}

/// `isParameterDeformerKeyform` and `hasValidDeformerKeyform`: the keyform matches the node's
/// layout; an `unbounded` binding's opacity, colors and rotation scale may leave their ranges.
pub(super) fn keyform_matches(
    keyform: &ParameterDeformerKeyform,
    node: &DeformerNode,
    unbounded: bool,
) -> bool {
    let spatial = node.shape.deformer_type == Some(DeformerType::Spatial);
    let has_spatial = keyform.spatial_origin.is_some()
        || keyform.spatial_mesh_position.is_some()
        || keyform.spatial_rotation.is_some()
        || keyform.spatial_scale.is_some()
        || keyform.spatial_translation.is_some();
    let node_indices: HashSet<usize> = node
        .shape
        .curve_handles
        .iter()
        .flatten()
        .map(|h| h.point_index)
        .collect();
    let handles = keyform.curve_handles.as_deref().unwrap_or_default();
    let rotation = node.shape.deformer_type == Some(DeformerType::Rotation);
    node.shape.control_points.len() == keyform.control_points.len()
        && (spatial || !has_spatial)
        && keyform
            .rotation_scale
            .is_none_or(|scale| rotation && scale.is_finite() && (unbounded || scale >= 0.0))
        && keyform
            .rotation_angle
            .is_none_or(|angle| rotation && angle.is_finite())
        && (keyform.rotation_reflection.is_none() || rotation)
        && keyform
            .properties
            .as_ref()
            .is_none_or(|p| Effect::from(p).ok(unbounded))
        && keyform
            .spatial_scale
            .is_none_or(|s| s.iter().all(|&v| v > 0.0))
        && handles.len() == node_indices.len()
        && handles
            .iter()
            .all(|h| node_indices.contains(&h.point_index))
        && curve_handles_ok(handles, None)
}

#[cfg(test)]
mod tests {
    use serde_json::{Value, json};

    use crate::validate::test_support::{accepts, document, merge, parameter};

    /// A rotation deformer (or grid with `deformer_type: null`) keyed by one binding.
    fn valid(node: Value, keyform: Value) -> bool {
        valid_with(node, keyform, json!({}))
    }

    /// [`valid`] with `binding` merged into the binding.
    fn valid_with(node: Value, keyform: Value, binding: Value) -> bool {
        let deformer = merge(
            json!({
                "kind": "deformer", "id": "rot", "name": "Rot", "locked": false, "visible": true,
                "children": [], "deformerType": "rotation", "boneRestPoints": [0, 0, 10, 0],
                "controlPoints": [0, 0, 10, 0], "columns": 1, "rows": 1,
                "bounds": {"x": -10, "y": -10, "width": 20, "height": 20},
            }),
            node,
        );
        let entry = merge(
            json!({"kind": "deformer", "nodeId": "rot", "controlPoints": [0, 0, 10, 0]}),
            keyform,
        );
        let mut parameter_binding = merge(
            json!({"id": "b", "parameterIds": ["s"], "targetPartIds": [],
                "targetDeformerIds": ["rot"]}),
            binding,
        );
        parameter_binding["keyforms"] = json!([{"values": [1], "parts": [], "deformers": [entry]}]);
        accepts(document(json!({
            "parameters": [parameter("s", 0.0, 1.0, 0.0)],
            "scene": {"roots": [deformer]},
            "parameterBindings": [parameter_binding],
        })))
    }

    #[test]
    fn deformer_properties_and_rotation_scales_are_checked() {
        let properties = json!({"properties": {"opacity": 0.5, "screenColor": [0, 0, 1]}});
        assert!(valid(properties.clone(), json!({"rotationScale": 2})));
        assert!(valid(json!({}), properties));
        // `rotationScale >= 0`: zero collapses the deformer, a negative scale is rejected.
        assert!(valid(json!({}), json!({"rotationScale": 0})));
        assert!(valid(json!({"rotationScale": 0}), json!({})));
        assert!(!valid(json!({}), json!({"rotationScale": -1})));
        assert!(!valid(json!({"rotationScale": -1}), json!({})));
        assert!(valid(json!({"deformerType": null}), json!({})));
        assert!(!valid(
            json!({"deformerType": null}),
            json!({"rotationScale": 2})
        ));
        // A rotation node may also store its base scale.
        assert!(valid(json!({"rotationScale": 2}), json!({})));
        assert!(!valid(json!({}), json!({"properties": {"opacity": 2}})));
        assert!(!valid(json!({"properties": {"drawOrder": 300}}), json!({})));
    }

    #[test]
    fn unbounded_deformer_keyforms_leave_display_ranges() {
        // `isParameterDeformerKeyform(value, unbounded)`: opacity, colors and rotation scale
        // may leave their ranges; the node's own values stay bounded.
        let unbounded = json!({"keyformRange": "unbounded"});
        for keyform in [
            json!({"properties": {"opacity": 2}}),
            json!({"properties": {"multiplyColor": [1, -0.5, 1], "screenColor": [0, 0, 1.5]}}),
            json!({"rotationScale": -0.5}),
        ] {
            assert!(!valid(json!({}), keyform.clone()), "bounded {keyform}");
            assert!(
                valid_with(json!({}), keyform.clone(), unbounded.clone()),
                "unbounded {keyform}"
            );
        }
        assert!(!valid_with(
            json!({"properties": {"opacity": 2}}),
            json!({}),
            unbounded.clone()
        ));
        assert!(!valid_with(
            json!({"rotationScale": -1}),
            json!({}),
            unbounded
        ));
    }

    #[test]
    fn rotation_reference_distances_are_finite_nonzero_rotation_fields() {
        // `hasRotationReference` in `isDeformerShape`, which also covers binding layouts.
        assert!(valid(json!({"rotationReferenceDistance": -0.1}), json!({})));
        assert!(!valid(json!({"rotationReferenceDistance": 0}), json!({})));
        assert!(!valid(
            json!({"deformerType": null, "rotationReferenceDistance": 0.1}),
            json!({})
        ));
        let layout = |distance: f64| {
            json!({"deformerType": "rotation", "boneRestPoints": [0, 0, 10, 0],
                "controlPoints": [0, 0, 10, 0], "columns": 1, "rows": 1,
                "bounds": {"x": -10, "y": -10, "width": 20, "height": 20},
                "rotationReferenceDistance": distance})
        };
        let binding = |rest: Value, shape: Value| json!({"binding": {"rest": rest, "steps": [{"shape": shape}]}});
        assert!(valid(binding(layout(0.1), layout(0.1)), json!({})));
        assert!(!valid(binding(layout(0.0), layout(0.1)), json!({})));
        assert!(!valid(binding(layout(0.1), layout(0.0)), json!({})));
    }

    #[test]
    fn grids_whose_point_count_overflows_are_rejected() {
        // (2^32) × (2^31) points fit in u64, but twice that (the coordinate count) does not:
        // unchecked math panicked in debug and wrapped to 0 (accepting no points) in release.
        let deformer = json!({"kind": "deformer", "id": "grid", "name": "Grid", "locked": false,
            "visible": true, "children": [], "columns": 4_294_967_295u64, "rows": 2_147_483_647,
            "controlPoints": [], "bounds": {"x": 0, "y": 0, "width": 1, "height": 1}});
        assert!(!accepts(document(json!({"scene": {"roots": [deformer]}}))));
    }

    #[test]
    fn rotation_angles_belong_to_rotation_deformers() {
        // `hasCoordinateOptions` and `hasValidDeformerKeyform`.
        assert!(valid(
            json!({"rotationAngle": 6.5}),
            json!({"rotationAngle": 12.5})
        ));
        assert!(!valid(
            json!({"deformerType": null, "rotationAngle": 1}),
            json!({})
        ));
        assert!(!valid(
            json!({"deformerType": null}),
            json!({"rotationAngle": 1})
        ));
    }
}
