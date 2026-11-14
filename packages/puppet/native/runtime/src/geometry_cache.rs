//! Exact per-part geometry reuse before Glue; display plans and simulation always advance.
use crate::apply::PosedScene;
use crate::model::{Model, SceneTree};
use std::collections::HashMap;

#[derive(Default)]
struct PartCache {
    parameters: Vec<u64>,
    input: Vec<f32>,
    output: Vec<f32>,
    initialized: bool,
}
#[derive(Default)]
pub(crate) struct GeometryCache {
    parts: Vec<PartCache>,
    transforms: HashMap<usize, (Vec<u64>, u64)>,
    revision: u64,
}
impl GeometryCache {
    pub(crate) fn prepare(
        &mut self,
        model: &Model,
        posed: &PosedScene<'_>,
        vertices: &mut [Vec<f32>],
    ) -> Vec<bool> {
        self.parts.resize_with(vertices.len(), PartCache::default);
        let mut versions = vec![0; posed.deformers.len()];
        let mut seen = HashMap::new();
        for (index, pose) in posed.deformers.iter().enumerate() {
            let id = model.coordinate_ids[index];
            let version = *seen.entry(id).or_insert_with(|| {
                let mut values: Vec<u64> =
                    pose.control_points.iter().map(|v| v.to_bits()).collect();
                values.push(pose.handles.len() as u64);
                for handle in &pose.handles {
                    match handle {
                        None => values.push(0),
                        Some(h) => values.extend([
                            1,
                            h.point_index as u64,
                            h.horizontal.x.to_bits(),
                            h.horizontal.y.to_bits(),
                            h.vertical.x.to_bits(),
                            h.vertical.y.to_bits(),
                        ]),
                    }
                }
                values.extend([
                    pose.rotation.scale.to_bits(),
                    u64::from(pose.rotation.reflection[0]),
                    u64::from(pose.rotation.reflection[1]),
                    u64::from(pose.rotation.angle.is_some()),
                    pose.rotation.angle.unwrap_or(0.0).to_bits(),
                ]);
                if let Some(spatial) = pose.spatial {
                    for axis in [
                        spatial.mesh_position,
                        spatial.origin,
                        spatial.rotation,
                        spatial.scale,
                        spatial.translation,
                    ] {
                        values.extend(axis.map(f64::to_bits));
                    }
                }
                let previous = self.transforms.entry(id).or_default();
                if previous.0 != values || previous.1 == 0 {
                    self.revision += 1;
                    *previous = (values, self.revision);
                }
                previous.1
            });
            versions[index] = version;
        }
        vertices
            .iter_mut()
            .enumerate()
            .map(|(index, points)| {
                let cache = &mut self.parts[index];
                let parameters: Vec<_> = model.geometry_deformers[index]
                    .iter()
                    .map(|&p| versions[p])
                    .collect();
                let equal = cache.input.len() == points.len()
                    && cache
                        .input
                        .iter()
                        .zip(points.iter())
                        .all(|(a, b)| a.to_bits() == b.to_bits());
                let reuse = model.geometry_cacheable[index]
                    && cache.initialized
                    && cache.parameters == parameters
                    && equal;
                if reuse {
                    points.clone_from(&cache.output);
                } else {
                    cache.parameters = parameters;
                    cache.input.clone_from(points);
                }
                !reuse
            })
            .collect()
    }
    pub(crate) fn record(&mut self, active: &[bool], vertices: &[Vec<f32>]) {
        for (index, points) in vertices.iter().enumerate() {
            if active[index] {
                let cache = &mut self.parts[index];
                cache.output.clone_from(points);
                cache.initialized = true;
            }
        }
    }
}
pub(crate) fn dependencies(model: &Model) -> (Vec<Vec<usize>>, Vec<bool>) {
    fn visit(
        model: &Model,
        nodes: &[SceneTree],
        parent: &[usize],
        parts: &mut [Vec<usize>],
        cacheable: &mut [bool],
    ) {
        for node in nodes {
            match node {
                SceneTree::Group { children, .. } => {
                    visit(model, children, parent, parts, cacheable)
                }
                SceneTree::Deformer {
                    index, children, ..
                } => {
                    let mut path = parent.to_vec();
                    path.push(*index);
                    visit(model, children, &path, parts, cacheable);
                }
                SceneTree::Part {
                    part: Some(index),
                    skin,
                    ..
                } => {
                    parts[*index] = parent.to_vec();
                    cacheable[*index] =
                        skin.is_none() && model.document.parts[*index].spatial.is_none();
                }
                SceneTree::Part { part: None, .. } => {}
            }
        }
    }
    let mut parts = vec![Vec::new(); model.parts.len()];
    let mut cacheable = vec![false; model.parts.len()];
    visit(model, &model.scene, &[], &mut parts, &mut cacheable);
    (parts, cacheable)
}
pub(crate) fn active_nodes(nodes: &[SceneTree], active: &[bool]) -> bool {
    nodes.iter().any(|node| match node {
        SceneTree::Part {
            part: Some(index), ..
        } => active[*index],
        SceneTree::Part { part: None, .. } => false,
        SceneTree::Group { children, .. } | SceneTree::Deformer { children, .. } => {
            active_nodes(children, active)
        }
    })
}
