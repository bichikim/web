//! Player-local attachment poses. Fixed topology is shared by pending frames; each pose
//! retains its authored weights and ordered GPU deltas until its last owner completes.
use crate::model::{GlueConnection, Model};
use std::sync::Arc;

#[derive(Default)]
pub(crate) struct GluePose {
    pub(crate) changes: Vec<(usize, f64, f64)>,
}
impl GluePose {
    pub(crate) fn connections<'a>(
        &'a self,
        model: &'a Model,
    ) -> impl Iterator<Item = GlueConnection> + 'a {
        let mut changes = self.changes.iter().peekable();
        model
            .glue_connections
            .iter()
            .enumerate()
            .map(move |(index, base)| {
                let mut current = *base;
                if changes.peek().is_some_and(|change| change.0 == index) {
                    let &(_, weight, strength) = changes.next().unwrap();
                    current.weight = weight;
                    current.strength = strength;
                }
                current
            })
    }
}

pub(crate) struct GlueCache {
    dependencies: Vec<usize>,
    dynamic: Vec<usize>,
    previous: Vec<u64>,
    pose: Option<Arc<GluePose>>,
}
impl GlueCache {
    pub(crate) fn new(model: &Model) -> Self {
        let mut bindings: Vec<_> = model
            .glue_bindings
            .iter()
            .flatten()
            .map(|binding| binding.binding)
            .collect();
        bindings.sort_unstable();
        bindings.dedup();
        let mut dependencies: Vec<_> = bindings
            .into_iter()
            .flat_map(|index| {
                model.bindings[index].parameters.iter().copied().chain(
                    model.document.parameter_bindings[index]
                        .influences
                        .iter()
                        .flatten()
                        .filter_map(|influence| model.parameter_index(&influence.parameter_id)),
                )
            })
            .collect();
        dependencies.sort_unstable();
        dependencies.dedup();
        let dynamic: Vec<_> = model
            .glue_bindings
            .iter()
            .enumerate()
            .filter_map(|(index, bindings)| (!bindings.is_empty()).then_some(index))
            .collect();
        // Unkeyed ratios are validated, including the unit weight required by edges.
        Self {
            dependencies,
            dynamic,
            previous: Vec::new(),
            pose: None,
        }
    }
    pub(crate) fn resolve(&mut self, model: &Model, values: &[f64]) -> Arc<GluePose> {
        if let Some(pose) = &self.pose
            && self
                .previous
                .iter()
                .zip(&self.dependencies)
                .all(|(&old, &index)| old == values.get(index).copied().unwrap_or(0.0).to_bits())
        {
            return Arc::clone(pose);
        }
        self.previous.clear();
        self.previous.extend(
            self.dependencies
                .iter()
                .map(|&index| values.get(index).copied().unwrap_or(0.0).to_bits()),
        );
        let changes = self
            .dynamic
            .iter()
            .filter_map(|&index| {
                changed(
                    index,
                    &model.compose_glue_connection(index, values),
                    &model.glue_connections[index],
                )
            })
            .collect();
        let pose = Arc::new(GluePose { changes });
        self.pose = Some(Arc::clone(&pose));
        pose
    }
}

fn changed(
    index: usize,
    current: &GlueConnection,
    base: &GlueConnection,
) -> Option<(usize, f64, f64)> {
    (current.weight.to_bits() != base.weight.to_bits()
        || current.strength.to_bits() != base.strength.to_bits())
    .then_some((index, current.weight, current.strength))
}

#[cfg(test)]
mod tests {
    use super::*;
    use poffo_format::{Document, ValidDocument};
    use serde_json::json;
    fn model(keyed: bool) -> Model {
        let parts:Vec<_>=["first","second"].map(|id|json!({"id":id,"texture":{"src":"x","width":1,"height":1},"mesh":{"vertices":[0,0,1,0,0,1],"uvs":[0,0,1,0,0,1],"indices":[0,1,2]}})).into();
        let binding = json!({"id":"binding","interpolation":"grid","parameterIds":["p"],"targetGlueIds":["join"],"influences":[{"parameterId":"influence","points":[{"value":0,"weight":0},{"value":1,"weight":1}]}],"keyforms":[{"values":[0],"parts":[],"glue":[{"id":"join","weight":0.25,"strength":0.5}]},{"values":[1],"parts":[],"glue":[{"id":"join","weight":0.9,"strength":0.8}]}]});
        let document:Document=serde_json::from_value(json!({"format":"winter-love-poffo","version":1,"viewport":{"width":1,"height":1},"motions":[],"parts":parts,"parameters":(["p","influence","unrelated"].map(|id|json!({"id":id,"name":id,"minimum":0,"maximum":1,"defaultValue":0}))),"glue":[{"id":"join","first":{"partId":"first","vertexIndex":0},"second":{"partId":"second","vertexIndex":0},"weight":0.25,"strength":0.5}],"parameterBindings":if keyed {vec![binding]} else {vec![]}})).unwrap();
        Model::new(ValidDocument::new(document).unwrap())
    }
    #[test]
    fn preserves_pending_pose_weights_when_inputs_and_influences_change() {
        let model = model(true);
        let mut cache = GlueCache::new(&model);
        let first = cache.resolve(&model, &[0.37, 0.61, 0.0]);
        let saved = (
            first.connections(&model).next().unwrap().weight.to_bits(),
            first.connections(&model).next().unwrap().strength.to_bits(),
            first.changes.clone(),
        );
        for values in [
            [0.37, 0.61, 1.0],
            [0.37, 0.0, 1.0],
            [1.0, 1.0, 0.0],
            [0.37, 0.61, 0.0],
            [0.0, 1.0, 0.0],
        ] {
            let actual = cache.resolve(&model, &values);
            let expected: Vec<_> = (0..model.glue_connections.len())
                .map(|index| model.compose_glue_connection(index, &values))
                .collect();
            for (actual, expected) in actual.connections(&model).zip(&expected) {
                assert_eq!(actual.weight.to_bits(), expected.weight.to_bits());
                assert_eq!(actual.strength.to_bits(), expected.strength.to_bits());
            }
        }
        assert_eq!(
            (
                first.connections(&model).next().unwrap().weight.to_bits(),
                first.connections(&model).next().unwrap().strength.to_bits(),
                first.changes.clone()
            ),
            saved
        );
        assert!(cache.resolve(&model, &[0.0, 1.0, 0.0]).changes.is_empty());
    }
    #[test]
    fn shares_unkeyed_topology_across_unrelated_parameter_changes() {
        let model = model(false);
        let mut cache = GlueCache::new(&model);
        let first = cache.resolve(&model, &[0.0, 0.0, 0.0]);
        let second = cache.resolve(&model, &[1.0, 1.0, 1.0]);
        assert!(Arc::ptr_eq(&first, &second));
        assert!(second.changes.is_empty());
        assert_eq!(
            second.connections(&model).next().unwrap().weight.to_bits(),
            0.25_f64.to_bits()
        );
    }
    #[test]
    fn preserves_validated_unkeyed_edge_weights() {
        let mut document = model(false).document;
        document.glue[0].second.edge = Some(poffo_format::document::GlueEdge {
            end_index: 1,
            position: 0.5,
        });
        document.glue[0].weight = 1.0;
        let model = Model::new(ValidDocument::new(document).unwrap());
        let mut cache = GlueCache::new(&model);
        let pose = cache.resolve(&model, &[0.0, 0.0, 0.0]);
        assert!(pose.changes.is_empty());
        assert_eq!(pose.connections(&model).next().unwrap().weight, 1.0);
        assert_eq!(model.glue_connections[0].weight, 1.0);
    }
    #[test]
    fn retains_unkeyed_signed_zero_ratios_bit_for_bit() {
        let mut document = model(false).document;
        document.glue[0].weight = -0.0;
        document.glue[0].strength = -0.0;
        let model = Model::new(ValidDocument::new(document).unwrap());
        let mut cache = GlueCache::new(&model);
        let pose = cache.resolve(&model, &[0.0, 0.0, 0.0]);
        let actual = pose.connections(&model).next().unwrap();
        let expected = model.compose_glue_connection(0, &[]);
        assert_eq!(actual.weight.to_bits(), expected.weight.to_bits());
        assert_eq!(actual.strength.to_bits(), expected.strength.to_bits());
    }
}
