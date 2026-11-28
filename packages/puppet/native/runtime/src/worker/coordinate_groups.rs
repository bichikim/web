use super::WorkerError;
use serde::Serialize;
use serde_json::Value;
use std::collections::HashMap;

#[derive(Eq, Hash, PartialEq)]
struct BindingCoordinates {
    layout: usize,
    samples: Vec<(usize, usize)>,
}

#[derive(Default)]
struct TargetSamples {
    last_keyform: Option<usize>,
    coordinates: Vec<(usize, usize)>,
}

fn fields_except<'a>(value: &'a Value, excluded: &[&str]) -> Vec<(&'a str, &'a Value)> {
    value
        .as_object()
        .into_iter()
        .flatten()
        .filter(|(key, _)| !excluded.contains(&key.as_str()))
        .map(|(key, value)| (key.as_str(), value))
        .collect()
}

fn intern<T: Serialize>(
    keys: &mut HashMap<Vec<u8>, usize>,
    value: &T,
) -> Result<usize, WorkerError> {
    let key = serde_json::to_vec(value).map_err(WorkerError::Json)?;
    let next = keys.len();
    Ok(*keys.entry(key).or_insert(next))
}

fn index_bindings(document: &Value) -> Result<HashMap<&str, Vec<BindingCoordinates>>, WorkerError> {
    let mut bindings = HashMap::<_, Vec<_>>::new();
    let mut layouts = HashMap::new();
    let mut samples = HashMap::new();
    for binding in document["parameterBindings"]
        .as_array()
        .into_iter()
        .flatten()
    {
        let mut targets: HashMap<_, TargetSamples> = binding["targetDeformerIds"]
            .as_array()
            .into_iter()
            .flatten()
            .filter_map(Value::as_str)
            .map(|id| (id, TargetSamples::default()))
            .collect();
        if targets.is_empty() {
            continue;
        }
        let keyforms = binding["keyforms"]
            .as_array()
            .map_or(&[][..], Vec::as_slice);
        let options: Vec<_> = [
            "parameterIds",
            "influenceMode",
            "influences",
            "interpolation",
            "keyformRange",
            "sampling",
        ]
        .into_iter()
        .filter_map(|key| binding.get(key).map(|value| (key, value)))
        .collect();
        let values: Vec<_> = keyforms.iter().map(|form| &form["values"]).collect();
        let layout = intern(&mut layouts, &(options, values))?;
        for (index, form) in keyforms.iter().enumerate() {
            for sample in form["deformers"].as_array().into_iter().flatten() {
                if let Some(id) = sample["nodeId"].as_str()
                    && let Some(target) = targets.get_mut(id)
                    && target.last_keyform != Some(index)
                {
                    // The first entry for a target wins, even if it only keys properties.
                    target.last_keyform = Some(index);
                    let coordinates = fields_except(sample, &["nodeId", "properties"]);
                    if !coordinates.is_empty() {
                        let signature = intern(&mut samples, &coordinates)?;
                        target.coordinates.push((index, signature));
                    }
                }
            }
        }
        for (id, target) in targets {
            bindings.entry(id).or_default().push(BindingCoordinates {
                layout,
                samples: target.coordinates,
            });
        }
    }
    Ok(bindings)
}

type GroupKey<'a> = (usize, Vec<u8>, &'a [BindingCoordinates]);

fn visit<'a>(
    nodes: &Value,
    parent: usize,
    bindings: &'a HashMap<&str, Vec<BindingCoordinates>>,
    keys: &mut HashMap<GroupKey<'a>, usize>,
    groups: &mut Vec<(String, usize)>,
) -> Result<(), WorkerError> {
    for node in nodes.as_array().into_iter().flatten() {
        let mut next = parent;
        if node["kind"] == "deformer" {
            let id = node["id"].as_str().unwrap_or("");
            let shape = fields_except(
                node,
                &[
                    "id",
                    "name",
                    "kind",
                    "visible",
                    "locked",
                    "children",
                    "properties",
                    "parameterVisibility",
                ],
            );
            let shape = serde_json::to_vec(&shape).map_err(WorkerError::Json)?;
            let inputs = bindings.get(id).map_or(&[][..], Vec::as_slice);
            let candidate = keys.len() + 1;
            next = *keys.entry((parent, shape, inputs)).or_insert(candidate);
            groups.push((id.to_owned(), next));
        }
        visit(&node["children"], next, bindings, keys, groups)?;
    }
    Ok(())
}

/// Groups identical deformer transforms by parent and authored coordinate inputs.
pub(super) fn coordinate_groups(document: &Value) -> Result<Vec<(String, usize)>, WorkerError> {
    let bindings = index_bindings(document)?;
    let mut groups = Vec::new();
    visit(
        &document["scene"]["roots"],
        0,
        &bindings,
        &mut HashMap::new(),
        &mut groups,
    )?;
    Ok(groups)
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    #[test]
    fn groups_share_only_matching_parent_and_coordinate_inputs() {
        let node =
            |id, children| json!({"id":id,"kind":"deformer","points":[0,1],"children":children});
        let document = json!({
            "scene":{"roots":[
                node("first", vec![node("child", vec![])]),
                node("same", vec![node("same-child", vec![])]),
                node("different", vec![node("other-parent", vec![])]),
                node("empty", vec![]), node("properties", vec![]),
                node("unbound", vec![]), node("different-sampling", vec![]),
            ]},
            "parameterBindings":[
                {
                    "parameterIds":["gaze"], "sampling":"linear",
                    "targetDeformerIds":["first","same","different","empty","properties"],
                    "keyforms":[
                        {"values":[1], "deformers":[
                            {"nodeId":"first","points":[1,2]},
                            {"nodeId":"first","points":[9,9]},
                            {"nodeId":"same","points":[1,2],"properties":{"opacity":0}},
                            {"nodeId":"properties","properties":{"opacity":0}},
                        ]},
                        {"values":[2], "deformers":[{"nodeId":"different","points":[1,2]}]},
                    ],
                },
                {
                    "parameterIds":["gaze"], "sampling":"stepped",
                    "targetDeformerIds":["different-sampling"],
                    "keyforms":[
                        {"values":[1], "deformers":[{"nodeId":"different-sampling","points":[1,2]}]},
                        {"values":[2]},
                    ],
                },
            ],
        });
        let groups: Vec<_> = coordinate_groups(&document)
            .unwrap()
            .into_iter()
            .map(|(_, id)| id)
            .collect();
        assert_eq!(groups, [1, 2, 1, 2, 3, 4, 5, 5, 6, 7]);
    }
}
