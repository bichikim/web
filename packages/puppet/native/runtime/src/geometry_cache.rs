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
    versions: Vec<u64>,
    seen: HashMap<usize, u64>,
    scratch: Vec<u64>,
    active: Vec<bool>,
    active_deformers: Vec<bool>,
}

pub(crate) struct PreparedGeometry<'a> {
    pub(crate) active: &'a [bool],
    pub(crate) deformers: &'a [bool],
}
impl GeometryCache {
    pub(crate) fn defer(&mut self, part: usize, stamp: &mut Vec<u64>) {
        let cache = &mut self.parts[part];
        stamp.clone_from(&cache.parameters);
        cache.initialized = false;
    }
    pub(crate) fn complete(&mut self, part: usize, stamp: &[u64], input: &[f32], output: &[f32]) {
        let cache = &mut self.parts[part];
        if cache.parameters == stamp
            && cache.input.len() == input.len()
            && cache
                .input
                .iter()
                .zip(input)
                .all(|(a, b)| a.to_bits() == b.to_bits())
        {
            cache.output.clear();
            cache.output.extend_from_slice(output);
            cache.initialized = true;
        }
    }
    pub(crate) fn prepare(
        &mut self,
        model: &Model,
        posed: &PosedScene<'_>,
        vertices: &mut [Vec<f32>],
        required: Option<&[bool]>,
    ) -> PreparedGeometry<'_> {
        self.parts.resize_with(vertices.len(), PartCache::default);
        self.versions.resize(posed.len(), 0);
        // A zero version means no required, cacheable part has used this dependency yet.
        self.versions.fill(0);
        self.seen.clear();
        for (index, dependencies) in model.geometry_deformers.iter().enumerate() {
            if model.geometry_cacheable[index] && required.is_none_or(|required| required[index]) {
                for &dependency in dependencies {
                    if self.versions[dependency] == 0 {
                        let id = model.coordinate_ids[dependency];
                        let version = if let Some(&version) = self.seen.get(&id) {
                            version
                        } else {
                            let version = self.version(id, posed.at(dependency));
                            self.seen.insert(id, version);
                            version
                        };
                        self.versions[dependency] = version;
                    }
                }
            }
        }
        self.active.clear();
        self.active
            .extend(vertices.iter_mut().enumerate().map(|(index, points)| {
                if required.is_some_and(|needed| !needed[index]) {
                    return false;
                }
                if !model.geometry_cacheable[index] {
                    return true;
                }
                let cache = &mut self.parts[index];
                let dependencies = &model.geometry_deformers[index];
                let reuse = cache.initialized
                    && cache.parameters.len() == dependencies.len()
                    && cache
                        .parameters
                        .iter()
                        .zip(dependencies)
                        .all(|(&version, &index)| version == self.versions[index])
                    && cache.input.len() == points.len()
                    && cache
                        .input
                        .iter()
                        .zip(points.iter())
                        .all(|(a, b)| a.to_bits() == b.to_bits());
                if reuse {
                    points.clone_from(&cache.output);
                } else {
                    cache.parameters.clear();
                    cache
                        .parameters
                        .extend(dependencies.iter().map(|&index| self.versions[index]));
                    cache.input.clone_from(points);
                }
                !reuse
            }));
        self.active_deformers.resize(posed.len(), false);
        mark_active_deformers(
            &model.geometry_deformers,
            &self.active,
            &mut self.active_deformers,
        );
        PreparedGeometry {
            active: &self.active,
            deformers: &self.active_deformers,
        }
    }
    fn version(&mut self, id: usize, pose: &crate::deform::PosedDeformer<'_>) -> u64 {
        if let Some(revision) = pose.revision {
            let previous = self.transforms.entry(id).or_default();
            if previous.0.as_slice() != [revision] || previous.1 == 0 {
                self.revision += 1;
                previous.0.clear();
                previous.0.push(revision);
                previous.1 = self.revision;
            }
            return previous.1;
        }
        let values = &mut self.scratch;
        values.clear();
        values.extend(pose.control_points.iter().map(|v| v.to_bits()));
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
        if previous.0 != *values || previous.1 == 0 {
            self.revision += 1;
            previous.0.clone_from(values);
            previous.1 = self.revision;
        }
        previous.1
    }
    pub(crate) fn record(&mut self, model: &Model, vertices: &[Vec<f32>]) {
        for (index, points) in vertices.iter().enumerate() {
            if self.active[index] && model.geometry_cacheable[index] {
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
/// Dependencies are compiled at load; visit each active part's ancestors once per frame.
fn mark_active_deformers(dependencies: &[Vec<usize>], active: &[bool], deformers: &mut [bool]) {
    deformers.fill(false);
    for dependency in dependencies
        .iter()
        .zip(active)
        .filter(|(_, active)| **active)
        .flat_map(|(path, _)| path)
    {
        deformers[*dependency] = true;
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn active_dependencies_include_shared_ancestors_and_clear_previous_branches() {
        let dependencies = vec![vec![0, 1], vec![0, 2], vec![]];
        let mut active = vec![false; 3];
        mark_active_deformers(&dependencies, &[true, false, true], &mut active);
        assert_eq!(active, [true, true, false]);
        mark_active_deformers(&dependencies, &[false, true, false], &mut active);
        assert_eq!(active, [true, false, true]);
        mark_active_deformers(&dependencies, &[false; 3], &mut active);
        assert_eq!(active, [false; 3]);
    }
}
