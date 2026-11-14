//! Parameter binding shape rules: axes, targets, influences and keyform grids.

use std::collections::HashSet;

use super::{
    Check, Effect, ensure, is_keyed_ratio, is_ratio, is_unbounded, non_empty_unique, number_key,
    unique,
};
use crate::document::{ParameterBinding, ParameterInfluence};

pub(crate) fn validate_influences(influences: &[ParameterInfluence], path: &str) -> Check {
    for (index, relation) in influences.iter().enumerate() {
        let increasing = relation.points.windows(2).all(|p| p[0].value < p[1].value);
        ensure(
            !relation.points.is_empty()
                && increasing
                && relation.points.iter().all(|p| is_ratio(p.weight)),
            || format!("{path}[{index}]"),
            "points need increasing values and 0..=1 weights",
        )?;
    }
    ensure(
        unique(influences.iter().map(|r| r.parameter_id.as_str())),
        || path.to_owned(),
        "duplicate influence parameter",
    )
}

pub(super) fn validate_binding_shape(binding: &ParameterBinding, path: &str) -> Check {
    if let Some(policy) = binding.sampling {
        ensure(
            policy
                .key_tolerance
                .is_none_or(|t| t.is_finite() && (0.0..0.5).contains(&t)),
            || format!("{path}.sampling.keyTolerance"),
            "must be finite and within 0..0.5",
        )?;
    }
    let axes = binding.parameter_ids.len();
    ensure(
        !binding.id.is_empty()
            && (1..=3).contains(&axes)
            && non_empty_unique(&binding.parameter_ids),
        || path.to_owned(),
        "needs an id and one to three distinct parameters",
    )?;
    for ids in [&binding.target_deformer_ids, &binding.target_part_ids]
        .into_iter()
        .flatten()
    {
        ensure(
            non_empty_unique(ids),
            || format!("{path}.targets"),
            "must be unique, non-empty ids",
        )?;
    }
    if let Some(influences) = &binding.influences {
        validate_influences(influences, &format!("{path}.influences"))?;
    }
    let unbounded = is_unbounded(binding);
    for (index, keyform) in binding.keyforms.iter().enumerate() {
        let keyform_path = format!("{path}.keyforms[{index}]");
        ensure(
            keyform.values.len() == axes,
            || keyform_path.clone(),
            "needs one value per parameter",
        )?;
        let deformers = keyform.deformers.as_deref().unwrap_or_default();
        ensure(
            unique(deformers.iter().map(|d| d.node_id.as_str())),
            || keyform_path.clone(),
            "duplicate deformer",
        )?;
        ensure(
            unique(keyform.parts.iter().map(|p| p.part_id.as_str())),
            || keyform_path.clone(),
            "duplicate part",
        )?;
        for (part_index, part) in keyform.parts.iter().enumerate() {
            let part_path = format!("{keyform_path}.parts[{part_index}]");
            ensure(
                !part.part_id.is_empty(),
                || part_path.clone(),
                "needs a part id",
            )?;
            if let Some(properties) = &part.properties {
                ensure(
                    Effect::from(properties).ok(unbounded),
                    || format!("{part_path}.properties"),
                    "values must be 0..=1 (draw order 0..=1000) unless the binding is unbounded",
                )?;
            }
            let glue = part.glue.as_deref().unwrap_or_default();
            ensure(
                glue.iter().all(|g| {
                    !g.id.is_empty() && is_ratio(g.weight) && is_keyed_ratio(g.strength, unbounded)
                }) && unique(glue.iter().map(|g| g.id.as_str())),
                || format!("{part_path}.glue"),
                "needs unique ids, a 0..=1 weight and a 0..=1 strength unless unbounded",
            )?;
        }
    }
    if binding.interpolation.is_some() {
        let count = (0..axes).fold(1usize, |count, axis| {
            let keys: HashSet<u64> = binding
                .keyforms
                .iter()
                .map(|k| number_key(k.values[axis]))
                .collect();
            count.saturating_mul(keys.len())
        });
        ensure(
            count == binding.keyforms.len(),
            || format!("{path}.interpolation"),
            "grid keyforms must fill the rectangular grid",
        )?;
    }
    // Keyed by JavaScript number, so -0 repeats 0 as it does in either encoding.
    let mut coordinates = HashSet::new();
    ensure(
        binding.keyforms.iter().all(|k| {
            coordinates.insert(k.values.iter().copied().map(number_key).collect::<Vec<_>>())
        }),
        || path.to_owned(),
        "duplicate keyform values",
    )?;
    if axes == 1 {
        let increasing = binding
            .keyforms
            .windows(2)
            .all(|p| p[0].values[0] < p[1].values[0]);
        ensure(increasing, || path.to_owned(), "1D keyforms must increase")?;
    }
    if axes == 3 {
        ensure(
            planes_match(binding),
            || path.to_owned(),
            "every third-parameter plane needs the same first/second values",
        )?;
    }
    Ok(())
}

/// Whether every plane along the third value holds the same first/second value points. Keyforms
/// are grouped by plane once, so the check is `O(K log K)`.
fn planes_match(binding: &ParameterBinding) -> bool {
    let third = |index: usize| binding.keyforms[index].values.get(2).copied();
    let mut order: Vec<usize> = (0..binding.keyforms.len()).collect();
    order.sort_by(|&a, &b| {
        third(a)
            .partial_cmp(&third(b))
            .unwrap_or(std::cmp::Ordering::Equal)
    });
    let mut signatures = order.chunk_by(|&a, &b| third(a) == third(b)).map(|plane| {
        let mut points: Vec<Vec<u64>> = plane
            .iter()
            .map(|&i| {
                let values = &binding.keyforms[i].values;
                values.iter().take(2).copied().map(number_key).collect()
            })
            .collect();
        points.sort();
        points
    });
    signatures
        .next()
        .is_none_or(|first| signatures.all(|plane| plane == first))
}

#[cfg(test)]
mod tests {
    use serde_json::{Value, json};

    use crate::PoffoFile;
    use crate::validate::test_support::{accepts, document, merge, parameter, triangle};

    /// Part `a` keyed by binding `b` with `part_keyform` merged into its single part entry.
    fn accepts_part_keyform(range: Option<&str>, part_keyform: Value) -> bool {
        let entry = merge(json!({"partId": "a", "vertices": []}), part_keyform);
        let mut binding = json!({"id": "b", "parameterIds": ["s"], "targetPartIds": ["a"],
            "keyforms": [{"values": [1], "parts": [entry]}]});
        if let Some(range) = range {
            binding["keyformRange"] = json!(range);
        }
        accepts(document(json!({
            "parts": [triangle("a")],
            "parameters": [parameter("s", 0.0, 1.0, 0.0)],
            "parameterBindings": [binding],
        })))
    }

    #[test]
    fn unbounded_bindings_accept_part_samples_outside_display_ranges() {
        // `isParameterPartKeyform(value, unbounded)`: properties and glue strength stay finite
        // but may leave 0..=1 (draw order 0..=1000); glue weight remains a ratio.
        let outside = [
            json!({"properties": {"opacity": 1.5}}),
            json!({"properties": {"multiplyColor": [-0.25, 1, 1], "screenColor": [0, 0, 1.25]}}),
            json!({"properties": {"drawOrder": 1200}}),
            json!({"properties": {"drawOrder": -3}}),
            json!({"glue": [{"id": "g", "weight": 0.5, "strength": 2}]}),
        ];
        for keyform in outside {
            assert!(
                !accepts_part_keyform(None, keyform.clone()),
                "bounded {keyform}"
            );
            // Unknown glue owners still fail later, so glue samples check only the shape here.
            if keyform.get("glue").is_none() {
                assert!(
                    accepts_part_keyform(Some("unbounded"), keyform.clone()),
                    "unbounded {keyform}"
                );
            }
        }
        assert!(!accepts_part_keyform(
            Some("unbounded"),
            json!({"glue": [{"id": "g", "weight": 1.5, "strength": 0.5}]})
        ));
        assert!(!accepts_part_keyform(
            Some("bounded"),
            json!({"properties": {"opacity": 0.5}})
        ));
    }

    /// A two-parameter binding keyed at `first` and `[0, 0]`.
    fn zero_keyforms(first: &str) -> String {
        format!(
            r#"{{"format": "winter-love-poffo", "version": 1, "viewport": {{"width": 1, "height": 1}},
            "parts": [], "motions": [],
            "parameters": [{{"id": "x", "name": "x", "minimum": -1, "maximum": 1, "defaultValue": 0}},
                {{"id": "y", "name": "y", "minimum": -1, "maximum": 1, "defaultValue": 0}}],
            "parameterBindings": [{{"id": "b", "parameterIds": ["x", "y"],
                "keyforms": [{{"values": {first}, "parts": []}}, {{"values": [0, 0], "parts": []}}]}}]}}"#
        )
    }

    #[test]
    fn negative_zero_keyforms_duplicate_zero_in_every_encoding() {
        // JavaScript writes -0 as `0`, so `[-0, 0]` repeats `[0, 0]` (a read file and a
        // directly deserialized document alike).
        let json = zero_keyforms("[-0.0, 0]");
        let file = PoffoFile::from_json(json.as_bytes()).expect("json");
        assert!(file.document().is_err(), "json");
        let document: crate::Document = serde_json::from_str(&json).expect("schema");
        assert_eq!(
            document.parameter_bindings[0].keyforms[0].values[0].to_bits(),
            (-0.0f64).to_bits()
        );
        assert!(crate::validate(&document).is_err(), "typed");
        let distinct = PoffoFile::from_json(zero_keyforms("[0.5, 0]").as_bytes()).expect("json");
        assert!(distinct.document().is_ok());
    }

    #[test]
    fn three_parameter_bindings_need_matching_planes() {
        let axis = |id: &str| parameter(id, -1.0, 1.0, 0.0);
        let binding = |values: Value| {
            let keyforms: Vec<Value> = values
                .as_array()
                .into_iter()
                .flatten()
                .map(|v| json!({"values": v, "parts": []}))
                .collect();
            document(json!({"parameters": [axis("x"), axis("y"), axis("z")],
                "parameterBindings": [{"id": "b", "parameterIds": ["x", "y", "z"],
                    "keyforms": keyforms}]}))
        };
        let valid = |values: Value| accepts(binding(values));
        assert!(valid(json!([[0, 0, -1], [1, 0, -1], [1, 0, 1], [0, 0, 1]])));
        assert!(!valid(json!([[0, 0, -1], [1, 0, -1], [0, 0, 1]])));
        assert!(!valid(json!([[0, 0, -1, 0]])));
        // -0 and 0 are one first/second value point.
        let mut planes = binding(json!([[0, 0, -1], [0, 0, 1]]));
        planes["parameterBindings"][0]["keyforms"][0]["values"][0] = json!(-0.0);
        let planes: crate::Document = serde_json::from_value(planes).expect("schema");
        assert!(crate::validate(&planes).is_ok());
    }
}
