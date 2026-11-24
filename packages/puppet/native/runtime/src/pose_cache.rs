//! Player-local grid samplers. Immutable keyforms stay in the model; only dependencies,
//! interpolation weights and the coordinates actually requested by geometry are retained.
use crate::{
    apply::PosedScene, deform::PosedDeformer, grid_keyform::GridSample, keyform::KeyformSample,
    model::Model,
};
#[cfg(feature = "parallel")]
use rayon::prelude::*;
use std::{borrow::Cow, cell::Cell, collections::HashMap};

struct GridBinding {
    index: usize,
    sample: Option<GridSample>,
    entries: Vec<Option<usize>>,
    weight: f64,
}
struct GridPose {
    index: usize,
    dependencies: Vec<usize>,
    previous: Vec<u64>,
    revision: u64,
    bindings: Vec<GridBinding>,
    coordinates: Vec<Cell<(u64, f64)>>,
}
impl GridPose {
    fn new(model: &Model, index: usize) -> Option<Self> {
        let compiled = &model.deformers[index];
        compiled.grid_interpolation()?;
        if compiled.node.shape.rotation_angle.is_some()
            || model.deformer_bindings[index]
                .iter()
                .any(|&b| model.bindings[b].grid.is_none())
        {
            return None;
        }
        let mut dependencies: Vec<_> = model.deformer_bindings[index]
            .iter()
            .flat_map(|&b| {
                let raw = &model.document.parameter_bindings[b];
                model.bindings[b].parameters.iter().copied().chain(
                    raw.influences
                        .iter()
                        .flatten()
                        .filter_map(|influence| model.parameter_index(&influence.parameter_id)),
                )
            })
            .collect();
        dependencies.sort_unstable();
        dependencies.dedup();
        Some(Self {
            index,
            dependencies,
            previous: Vec::new(),
            revision: 0,
            bindings: model.deformer_bindings[index]
                .iter()
                .map(|&b| GridBinding {
                    index: b,
                    entries: model.bindings[b]
                        .deformer_entries
                        .get(&index)
                        .cloned()
                        .unwrap_or_default(),
                    sample: None,
                    weight: 1.0,
                })
                .collect(),
            coordinates: vec![Cell::new((0, 0.0)); compiled.node.shape.control_points.len()],
        })
    }
    fn prepare(&mut self, model: &Model, values: &[f64]) {
        if self.revision != 0
            && self
                .previous
                .iter()
                .zip(&self.dependencies)
                .all(|(&old, &p)| old == values.get(p).copied().unwrap_or(0.0).to_bits())
        {
            return;
        }
        self.previous.clear();
        self.previous.extend(
            self.dependencies
                .iter()
                .map(|&p| values.get(p).copied().unwrap_or(0.0).to_bits()),
        );
        self.revision += 1;
        for binding in &mut self.bindings {
            binding.sample = match model.binding_sample(&model.bindings[binding.index], values) {
                Some(KeyformSample::Grid(sample)) => Some(sample),
                _ => None,
            };
            binding.weight = model.binding_influence(&model.bindings[binding.index], values);
        }
    }

    fn view<'a>(&'a self, model: &'a Model) -> GridView<'a> {
        let rest = &model.deformers[self.index].node.shape.control_points;
        let bindings = self
            .bindings
            .iter()
            .filter_map(|binding| {
                let sample = binding.sample?;
                let forms = &model.document.parameter_bindings[binding.index].keyforms;
                let channels = sample.coordinates(
                    |k| {
                        let entry = binding.entries.get(k).copied().flatten()?;
                        Some(
                            forms[k]
                                .deformers
                                .as_ref()?
                                .get(entry)?
                                .control_points
                                .as_slice(),
                        )
                    },
                    rest,
                );
                Some((channels, binding.weight))
            })
            .collect();
        GridView {
            pose: self,
            rest,
            bindings,
        }
    }
}

#[derive(Clone)]
pub(crate) struct GridView<'a> {
    pose: &'a GridPose,
    rest: &'a [f64],
    bindings: Vec<(crate::grid_keyform::GridCoordinates<'a>, f64)>,
}
impl GridView<'_> {
    #[inline]
    pub(crate) fn coordinate(&self, axis: usize) -> f64 {
        let cached = self.pose.coordinates[axis].get();
        if cached.0 == self.pose.revision {
            return cached.1;
        }
        let rest = self.rest[axis];
        let value = self
            .bindings
            .iter()
            .fold(rest, |current, (channels, weight)| {
                current + (channels.coordinate(axis, rest) - rest) * weight
            });
        self.pose.coordinates[axis].set((self.pose.revision, value));
        value
    }
}

#[derive(Default)]
pub(crate) struct PoseCache {
    indices: Vec<usize>,
    grids: Vec<Option<GridPose>>,
}
impl PoseCache {
    pub(crate) fn prepare(&mut self, model: &Model, values: &[f64]) {
        if self.indices.is_empty() {
            let mut canonical = HashMap::new();
            for (index, &id) in model.coordinate_ids.iter().enumerate() {
                let first = *canonical.entry(id).or_insert(index);
                self.indices.push(first);
                self.grids.push(
                    (first == index)
                        .then(|| GridPose::new(model, index))
                        .flatten(),
                );
            }
        }
        #[cfg(feature = "parallel")]
        if self.grids.len() >= 256 && rayon::current_num_threads() > 1 {
            self.grids
                .par_iter_mut()
                .with_min_len(64)
                .flatten()
                .for_each(|grid| grid.prepare(model, values));
            return;
        }
        for grid in self.grids.iter_mut().flatten() {
            grid.prepare(model, values);
        }
    }
    pub(crate) fn pose<'a>(&'a self, model: &'a Model, values: &'a [f64]) -> PosedScene<'a> {
        PosedScene::new(Cow::Borrowed(&self.indices), |index| {
            match &self.grids[index] {
                Some(grid) => {
                    PosedDeformer::grid(&model.deformers[index], grid.revision, grid.view(model))
                }
                None => model.pose_deformer(index, values),
            }
        })
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::{geometry::Vec2, geometry_cache::GeometryCache};
    use poffo_format::{Document, ValidDocument};
    use serde_json::json;

    fn model() -> Model {
        let points: Vec<f64> = (0..=4)
            .flat_map(|y| (0..=4).flat_map(move |x| [f64::from(x) / 4.0, f64::from(y) / 4.0]))
            .collect();
        let shape = json!({"kind":"deformer","id":"warp","name":"Warp","visible":true,"locked":false,"bounds":{"x":0,"y":0,"width":1,"height":1},"columns":4,"rows":4,"controlPoints":points,"coordinateSpace":"parent","interpolation":"bilinear","children":[{"id":"part","kind":"part","name":"Part","visible":true,"locked":false}]});
        let binding = |id: &str, scale: f64| json!({"id":id,"interpolation":"grid","parameterIds":["p"],"targetDeformerIds":["warp"],"influences":[{"parameterId":"weight","points":[{"value":0,"weight":0},{"value":1,"weight":1}]}],"keyforms":([0,1].map(|value|json!({"values":[value],"parts":[],"deformers":[{"nodeId":"warp","kind":"deformer","controlPoints":points.iter().enumerate().map(|(i,x)|x+(i%3)as f64*f64::from(value)*scale).collect::<Vec<_>>()}]})))});
        let document: Document = serde_json::from_value(json!({"format":"winter-love-poffo","version":1,"viewport":{"width":1,"height":1},"motions":[],"parameters":(["p","weight","unrelated"].map(|id|json!({"id":id,"name":id,"minimum":0,"maximum":1,"defaultValue":0}))),"parts":[{"id":"part","texture":{"src":"x","width":1,"height":1},"mesh":{"vertices":[0.1,0.2,0.5,0.4,0.3,0.9],"uvs":[0,0,1,0,0,1],"indices":[0,1,2]}}],"scene":{"roots":[shape]},"parameterBindings":[binding("first",0.17),binding("second",-0.013)]})).unwrap();
        Model::new(ValidDocument::new(document).unwrap())
    }

    #[test]
    fn grids_sample_only_requested_corners_and_keep_unchanged_inputs() {
        let model = model();
        let mut cache = PoseCache::default();
        cache.prepare(&model, &[0.37, 0.61, 0.0]);
        let posed = cache.pose(&model, &[0.37, 0.61, 0.0]);
        posed.at(0).transform(Vec2::new(0.1, 0.2), None);
        let grid = cache.grids[0].as_ref().unwrap();
        assert_eq!(
            grid.coordinates
                .iter()
                .filter(|p| p.get().0 == grid.revision)
                .count(),
            8
        );
        let revision = grid.revision;
        drop(posed);
        cache.prepare(&model, &[0.37, 0.61, 1.0]);
        assert_eq!(cache.grids[0].as_ref().unwrap().revision, revision);
    }

    #[test]
    fn influence_changes_and_restored_inputs_match_dense_composition_bit_for_bit() {
        let model = model();
        let mut cache = PoseCache::default();
        for values in [
            [0.37, 0.61, 0.0],
            [0.37, 0.0, 0.0],
            [1.0, 1.0, 0.0],
            [0.37, 0.61, 0.0],
            [0.0, 0.0, 0.0],
        ] {
            cache.prepare(&model, &values);
            let posed = cache.pose(&model, &values);
            let reference = model.pose_scene(&values);
            for index in 0..posed.len() {
                let actual = posed.at(index);
                let expected = reference.at(index);
                for i in 0..expected.control_points.len() {
                    assert_eq!(
                        actual.control_points.at(i).to_bits(),
                        expected.control_points.at(i).to_bits()
                    );
                }
            }
        }
    }

    #[test]
    fn shared_coordinate_groups_reuse_samplers_without_changing_vertex_results() {
        let mut model = model();
        model.deformers.push(model.deformers[0].clone());
        model
            .deformer_bindings
            .push(model.deformer_bindings[0].clone());
        model.coordinate_ids = vec![17, 17];
        let mut cache = PoseCache::default();
        let mut geometry = GeometryCache::default();
        for values in [
            [0.37, 0.61, 0.0],
            [1.0, 1.0, 0.0],
            [0.37, 0.61, 0.0],
            [0.37, 0.61, 0.0],
        ] {
            cache.prepare(&model, &values);
            let posed = cache.pose(&model, &values);
            assert!(std::ptr::eq(posed.at(0), posed.at(1)));
            let reference = model.pose_scene(&values);
            let mut actual = vec![vec![-0.5, 0.2, 0.1, 0.2, 1.5, 1.7]];
            let mut expected = actual.clone();
            crate::apply::apply_scene_deformers(&model, &posed, &mut geometry, &mut actual, None);
            crate::apply::apply_scene_deformers(
                &model,
                &reference,
                &mut GeometryCache::default(),
                &mut expected,
                None,
            );
            assert_eq!(actual, expected);
        }
    }
}
