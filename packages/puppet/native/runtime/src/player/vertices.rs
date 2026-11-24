//! Independent part composition preserves binding and motion order within each part.
use crate::{
    model::Model,
    motion::{MotionMix, mix_vertices},
    spatial::SpatialPartPose,
};
#[cfg(feature = "parallel")]
use rayon::prelude::*;
use std::collections::HashMap;

/// Parts consumed by color rendering, nested masks, or an earlier Glue operation.
pub(super) fn required_parts(model: &Model, plans: &[crate::plan::PartPlan]) -> Vec<bool> {
    let mut needed = vec![false; model.parts.len()];
    let mut masks = Vec::new();
    let mut visited = std::collections::HashSet::new();
    for plan in plans {
        if plan.render && plan.visible && plan.properties.opacity > 0.0 {
            needed[plan.part] = true;
            masks.extend(plan.mask.as_deref());
        }
    }
    while let Some(mask) = masks.pop() {
        if visited.insert(std::ptr::from_ref(mask)) {
            for source in &mask.sources {
                needed[source.part] = true;
                masks.extend(source.mask.as_deref());
            }
        }
    }
    // An earlier connection can feed coordinates to either end of a later one.
    for connection in model.glue_connections.iter().rev() {
        if needed[connection.first_part] || needed[connection.second_part] {
            needed[connection.first_part] = true;
            needed[connection.second_part] = true;
        }
    }
    needed
}

fn compose_part(
    model: &Model,
    values: &[f64],
    mix: &MotionMix,
    poses: &HashMap<usize, SpatialPartPose>,
    part: usize,
    vertices: &mut Vec<f32>,
    scratch: &mut Vec<f64>,
) {
    let rest = &model.parts[part].rest;
    model.compose_part_vertices(part, values, scratch);
    vertices.clear();
    vertices.extend(scratch.iter().map(|&x| x as f32));
    mix_vertices(mix, part, rest, vertices);
    if let Some(pose) = poses.get(&part) {
        for (index, value) in vertices.iter_mut().enumerate().take(pose.vertices.len()) {
            let rest = rest.get(index).copied().unwrap_or(0.0);
            *value = (f64::from(*value) + pose.vertices[index] - rest) as f32;
        }
    }
}
pub(super) fn compose_vertices(
    model: &Model,
    values: &[f64],
    mix: &MotionMix,
    poses: &HashMap<usize, SpatialPartPose>,
    vertices: &mut [Vec<f32>],
    scratch: &mut Vec<Vec<f64>>,
    required: Option<&[bool]>,
) {
    scratch.resize_with(vertices.len(), Vec::new);
    let needs_part = |index: usize| required.is_none_or(|needed| needed[index]);
    #[cfg(feature = "parallel")]
    if vertices.len() >= 128 && rayon::current_num_threads() > 1 {
        vertices
            .par_iter_mut()
            .zip(scratch.par_iter_mut())
            .enumerate()
            .with_min_len(64)
            .for_each(|(part, (vertices, scratch))| {
                if needs_part(part) {
                    compose_part(model, values, mix, poses, part, vertices, scratch);
                }
            });
        return;
    }
    for (part, (vertices, scratch)) in vertices.iter_mut().zip(scratch).enumerate() {
        if needs_part(part) {
            compose_part(model, values, mix, poses, part, vertices, scratch);
        }
    }
}
#[cfg(all(test, feature = "parallel"))]
mod tests {
    use super::*;
    use poffo_format::{Document, ValidDocument};
    use serde_json::json;
    #[test]
    fn matches_serial_word_for_word_with_independent_ranges_and_reused_buffers() {
        let parts:Vec<_>=(0..256).map(|i|json!({"id":format!("p{i}"),"texture":{"src":"x","width":1,"height":1},"mesh":{"vertices":[i as f64*0.13,0.2,0.5,0.4,0.3,0.9],"uvs":[0,0,1,0,0,1],"indices":[0,1,2]}})).collect();
        let document:Document=serde_json::from_value(json!({"format":"winter-love-poffo","version":1,"viewport":{"width":1,"height":1},"motions":[],"parts":parts,"parameters":[{"id":"p","name":"p","minimum":-1,"maximum":1,"defaultValue":0}],"parameterBindings":[{"id":"b","parameterIds":["p"],"keyforms":[{"values":[-1],"parts":(0..256).map(|i|json!({"partId":format!("p{i}"),"vertices":[1,2,3,4,5,6]})).collect::<Vec<_>>()},{"values":[1],"parts":(0..256).map(|i|json!({"partId":format!("p{i}"),"vertices":[-1,0,0.7,4,0.3,6]})).collect::<Vec<_>>()}]}]})).unwrap();
        let model = Model::new(ValidDocument::new(document).unwrap());
        let mix = MotionMix::default();
        let poses = HashMap::new();
        let one = rayon::ThreadPoolBuilder::new()
            .num_threads(1)
            .build()
            .unwrap();
        let many = rayon::ThreadPoolBuilder::new()
            .num_threads(3)
            .build()
            .unwrap();
        let mut serial = vec![vec![]; 256];
        let mut parallel = serial.clone();
        let mut first = vec![];
        let mut second = vec![];
        for value in [-1., -0.37, 0., 0.81, 1., -0.37] {
            one.install(|| {
                compose_vertices(
                    &model,
                    &[value],
                    &mix,
                    &poses,
                    &mut serial,
                    &mut first,
                    None,
                )
            });
            many.install(|| {
                compose_vertices(
                    &model,
                    &[value],
                    &mix,
                    &poses,
                    &mut parallel,
                    &mut second,
                    None,
                )
            });
            for (a, b) in serial.iter().flatten().zip(parallel.iter().flatten()) {
                assert_eq!(a.to_bits(), b.to_bits());
            }
        }
    }
}

#[cfg(test)]
mod required_parts_tests {
    use super::*;
    use crate::model::{GlueConnection, MaskPlan, MaskSource, PartProperties};
    use crate::plan::PartPlan;
    use crate::player::Player;
    use poffo_format::{Document, ValidDocument};
    use serde_json::json;
    use std::sync::Arc;

    #[test]
    fn retains_nested_masks_and_earlier_glue_dependencies() {
        let parts: Vec<_> = (0..8)
            .map(|index| json!({"id":index.to_string(),"texture":{"src":"x","width":1,"height":1},"mesh":{"vertices":[0,0,1,0,0,1],"uvs":[0,0,1,0,0,1],"indices":[0,1,2]}}))
            .collect();
        let document: Document = serde_json::from_value(json!({"format":"winter-love-poffo","version":1,"viewport":{"width":1,"height":1},"parts":parts,"motions":[],"parameters":[]})).unwrap();
        let mut model = Model::new(ValidDocument::new(document).unwrap());
        model.glue_connections = [(3, 4), (2, 3), (4, 5), (6, 7)]
            .map(|(first_part, second_part)| GlueConnection {
                first_part,
                second_part,
                first_offset: 0,
                second_offset: 0,
                edge: None,
                mode: None,
                rotation: None,
                weight: 0.5,
                strength: 1.0,
            })
            .into();
        let mask = |part, mask| {
            Arc::new(MaskPlan {
                sources: vec![MaskSource {
                    part,
                    inverted_mask: false,
                    mask,
                }],
            })
        };
        let plan = PartPlan {
            part: 0,
            layers: Arc::from([]),
            properties: PartProperties::default(),
            mask: Some(mask(1, Some(mask(2, None)))),
            render: true,
            visible: true,
        };
        assert_eq!(
            required_parts(&model, &[plan]),
            [true, true, true, true, true, false, false, false]
        );
    }

    #[test]
    fn evaluates_revealed_parts_from_the_current_inputs() {
        let document: Document = serde_json::from_value(json!({
            "format": "winter-love-poffo", "version": 1,
            "viewport": {"width": 10, "height": 10}, "motions": [],
            "parts": [{
                "id": "hand", "texture": {"src": "x", "width": 1, "height": 1},
                "mesh": {"vertices": [0, 0, 1, 0, 0, 1], "uvs": [0, 0, 1, 0, 0, 1], "indices": [0, 1, 2]}
            }],
            "parameters": [{"id": "show", "name": "Show", "minimum": -1, "defaultValue": -1, "maximum": 1}],
            "scene": {"roots": [{
                "kind": "part", "id": "hand", "name": "Hand", "visible": true, "locked": false,
                "parameterVisibility": [{"parameterId": "show", "minimum": 1, "maximum": 1}]
            }]},
            "parameterBindings": [{"id": "hand", "parameterIds": ["show"], "keyforms": [
                {"values": [-1], "parts": [{"partId": "hand", "vertices": [0, 0, 1, 0, 0, 1]}]},
                {"values": [0], "parts": [{"partId": "hand", "vertices": [2, 0, 3, 0, 2, 1]}]},
                {"values": [1], "parts": [{"partId": "hand", "vertices": [4, 0, 5, 0, 4, 1]}]}
            ]}]
        }))
        .unwrap();
        let model = Arc::new(Model::new(ValidDocument::new(document).unwrap()));
        let mut full = Player::new(Arc::clone(&model));
        let mut visible = Player::new(model);
        visible.render_geometry_only = true;
        let initial = visible.frame().vertices[0].clone();

        full.set_parameter_value("show", 0.0);
        visible.set_parameter_value("show", 0.0);
        assert!(!visible.frame().plans[0].visible);
        assert_ne!(full.frame().vertices[0], initial);
        assert_eq!(visible.frame().vertices[0], initial);

        full.set_parameter_value("show", 1.0);
        visible.set_parameter_value("show", 1.0);
        assert!(visible.frame().plans[0].visible);
        assert_eq!(visible.frame().vertices, full.frame().vertices);
    }
}
