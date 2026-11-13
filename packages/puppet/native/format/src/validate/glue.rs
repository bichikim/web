//! Vertex and boundary-edge glue references and keyed targets.

use std::collections::{HashMap, HashSet};

use super::{Check, Index, ensure, is_keyed_ratio, is_ratio, is_unbounded, unique};
use crate::document::{Document, Mesh};

/// Boundary edges (`mesh/boundary.ts`): edges used by exactly one triangle.
pub(crate) fn boundary_edges(mesh: &Mesh) -> Vec<(usize, usize)> {
    let mut counts: HashMap<(usize, usize), (usize, (usize, usize))> = HashMap::new();
    let mut order = Vec::new();
    for triangle in mesh.indices.chunks_exact(3) {
        let t = [
            triangle[0] as usize,
            triangle[1] as usize,
            triangle[2] as usize,
        ];
        for (a, b) in [(t[0], t[1]), (t[1], t[2]), (t[2], t[0])] {
            let key = (a.min(b), a.max(b));
            let entry = counts.entry(key).or_insert_with(|| {
                order.push(key);
                (0, (a, b))
            });
            entry.0 += 1;
        }
    }
    order
        .into_iter()
        .filter_map(|key| counts.get(&key).filter(|e| e.0 == 1).map(|e| e.1))
        .collect()
}

pub(super) fn validate_glue(document: &Document, index: &Index) -> Check {
    // Normalized boundary edges of the parts edge glue names, for constant-time lookups.
    let edge_parts: HashSet<&str> = document
        .glue
        .iter()
        .filter(|glue| glue.second.edge.is_some())
        .map(|glue| glue.second.part_id.as_str())
        .collect();
    let edges: HashMap<&str, HashSet<(usize, usize)>> = edge_parts
        .into_iter()
        .filter_map(|id| index.parts.get(id))
        .map(|part| {
            let edges = boundary_edges(&part.mesh)
                .into_iter()
                .map(|(a, b)| (a.min(b), a.max(b)));
            (part.id.as_str(), edges.collect())
        })
        .collect();
    let has_vertex = |part: &str, vertex: usize| {
        index
            .parts
            .get(part)
            .is_some_and(|p| vertex < p.mesh.vertex_count())
    };
    let mut ids = HashSet::new();
    let mut references = HashSet::new();
    let mut targets = HashSet::new();
    // Moving vertices of connections marked sequential, which may share them with each other.
    let mut sequential = HashSet::new();
    // Sequential glue computes shared vertices in order, so only exclusive glue rejects overlaps.
    let exclusive = document.glue_composition.is_none();
    let free = |key: &(&str, usize), occupied: &HashSet<(&str, usize)>| {
        !exclusive || !occupied.contains(key)
    };
    for (position, glue) in document.glue.iter().enumerate() {
        let path = || format!("glue[{position}]");
        let edge_ok = glue.second.edge.is_none_or(|edge| {
            is_ratio(edge.position)
                && glue.weight == 1.0
                && edges.get(glue.second.part_id.as_str()).is_some_and(|e| {
                    let (a, b) = (glue.second.vertex_index, edge.end_index);
                    e.contains(&(a.min(b), a.max(b)))
                })
        });
        ensure(
            !glue.id.is_empty()
                && ids.insert(glue.id.as_str())
                && glue.first.part_id != glue.second.part_id
                && is_ratio(glue.weight)
                && is_ratio(glue.strength)
                && edge_ok
                && has_vertex(&glue.first.part_id, glue.first.vertex_index)
                && has_vertex(&glue.second.part_id, glue.second.vertex_index),
            path,
            "invalid glue endpoints or ratios",
        )?;
        let mut keys = vec![(glue.first.part_id.as_str(), glue.first.vertex_index)];
        if glue.second.edge.is_none() {
            keys.push((glue.second.part_id.as_str(), glue.second.vertex_index));
        }
        let shared = |key: &(&str, usize)| glue.composition.is_some() && sequential.contains(key);
        ensure(
            keys.iter()
                .all(|k| free(k, &targets) && (free(k, &references) || shared(k))),
            path,
            "a moving vertex may join only one connection",
        )?;
        if let Some(edge) = glue.second.edge {
            let target_keys = [glue.second.vertex_index, edge.end_index]
                .map(|vertex| (glue.second.part_id.as_str(), vertex));
            ensure(
                target_keys.iter().all(|k| free(k, &references)),
                path,
                "edge endpoints must not move",
            )?;
            targets.extend(target_keys);
        }
        if glue.composition.is_some() {
            sequential.extend(keys.iter().copied());
        }
        references.extend(keys);
    }
    let owners: HashMap<&str, _> = document.glue.iter().map(|g| (g.id.as_str(), g)).collect();
    for binding in &document.parameter_bindings {
        let unbounded = is_unbounded(binding);
        let targets: Option<HashSet<&str>> = binding
            .target_glue_ids
            .as_ref()
            .map(|ids| ids.iter().map(String::as_str).collect());
        if let Some(ids) = &binding.target_glue_ids {
            ensure(
                unique(ids.iter().map(String::as_str))
                    && ids.iter().all(|id| owners.contains_key(id.as_str())),
                || format!("binding `{}`.targetGlueIds", binding.id),
                "must name distinct existing glue connections",
            )?;
        }
        for keyform in &binding.keyforms {
            let legacy: HashSet<_> = keyform
                .parts
                .iter()
                .flat_map(|part| part.glue.iter().flatten().map(|g| g.id.as_str()))
                .collect();
            let samples = keyform.glue.as_deref().unwrap_or_default();
            ensure(
                binding
                    .target_glue_ids
                    .as_ref()
                    .is_none_or(|ids| ids.len() == samples.len())
                    && unique(samples.iter().map(|s| s.id.as_str()))
                    && samples.iter().all(|sample| {
                        targets
                            .as_ref()
                            .is_none_or(|ids| ids.contains(sample.id.as_str()))
                            && !legacy.contains(sample.id.as_str())
                            && is_ratio(sample.weight)
                            && is_keyed_ratio(sample.strength, unbounded)
                            && owners
                                .get(sample.id.as_str())
                                .is_some_and(|g| g.second.edge.is_none() || sample.weight == 1.0)
                    }),
                || format!("binding `{}`.glue", binding.id),
                "invalid direct glue keyform",
            )?;
        }
        for part in binding.keyforms.iter().flat_map(|k| &k.parts) {
            for sample in part.glue.iter().flatten() {
                let ok = owners.get(sample.id.as_str()).is_some_and(|g| {
                    g.first.part_id == part.part_id
                        && (g.second.edge.is_none() || sample.weight == 1.0)
                });
                ensure(
                    ok,
                    || format!("binding `{}` glue `{}`", binding.id, sample.id),
                    "unknown glue owner",
                )?;
            }
        }
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use serde_json::{Value, json};

    use crate::validate::test_support::{self, document, merge, parameter, triangle};

    fn connection(id: &str, first: (&str, usize), second: (&str, usize)) -> Value {
        json!({"id": id, "weight": 0.5, "strength": 1,
            "first": {"partId": first.0, "vertexIndex": first.1},
            "second": {"partId": second.0, "vertexIndex": second.1}})
    }

    fn accepts(extra: Value) -> bool {
        let base = document(json!({
            "parts": [triangle("a"), triangle("b"), triangle("c")],
            "parameters": [parameter("s", 0.0, 1.0, 0.0)],
        }));
        test_support::accepts(merge(base, extra))
    }

    #[test]
    fn sequential_glue_may_share_vertices() {
        // `hasValidGlue(..., composition)`: overlaps are rejected only without a composition.
        let shared = json!([
            connection("ab", ("a", 0), ("b", 0)),
            connection("bc", ("b", 0), ("c", 0))
        ]);
        assert!(!accepts(json!({"glue": shared})));
        assert!(accepts(
            json!({"glue": shared, "glueComposition": "sequential"})
        ));
        let edge_shared = json!([
            connection("ab", ("a", 0), ("b", 0)),
            {"id": "cb", "weight": 1, "strength": 1, "first": {"partId": "c", "vertexIndex": 0},
             "second": {"partId": "b", "vertexIndex": 0, "edge": {"endIndex": 1, "position": 0.5}}},
        ]);
        assert!(!accepts(json!({"glue": edge_shared})));
        assert!(accepts(
            json!({"glue": edge_shared, "glueComposition": "sequential"})
        ));
        // A repeated id is still invalid in sequence.
        let repeated = json!([
            connection("ab", ("a", 0), ("b", 0)),
            connection("ab", ("a", 1), ("c", 1))
        ]);
        assert!(!accepts(
            json!({"glue": repeated, "glueComposition": "sequential"})
        ));
    }

    #[test]
    fn connections_marked_sequential_may_share_vertices_with_each_other() {
        // `hasVertexConflict`: without a document-wide composition, a moving vertex is shared
        // only between connections that are both `composition: sequential`.
        let sequential = |mut glue: Value| {
            glue["composition"] = json!("sequential");
            glue
        };
        let ab = || connection("ab", ("a", 0), ("b", 0));
        let ac = || connection("ac", ("a", 0), ("c", 1));
        let glue = |connections: Value| accepts(json!({"glue": connections}));
        assert!(glue(json!([sequential(ab()), sequential(ac())])));
        assert!(!glue(json!([ab(), sequential(ac())])));
        assert!(!glue(json!([sequential(ab()), ac()])));
        let mut unknown = ab();
        unknown["composition"] = json!("cubism");
        assert!(!glue(json!([unknown])));
        let repeated = sequential(connection("ab", ("a", 0), ("c", 1)));
        assert!(!glue(json!([sequential(ab()), repeated])));
        // An edge target must still not touch a moving vertex.
        let edge = json!({"id": "cb", "weight": 1, "strength": 1, "composition": "sequential",
            "first": {"partId": "c", "vertexIndex": 0},
            "second": {"partId": "b", "vertexIndex": 0, "edge": {"endIndex": 1, "position": 0.5}}});
        assert!(!glue(json!([sequential(ab()), edge])));
    }

    #[test]
    fn unbounded_bindings_key_glue_strength_beyond_ratios() {
        // `isGlueKeyforms(value, unbounded)`: strength is any finite number, weight a ratio.
        let binding = |range: Option<&str>, weight: f64, strength: f64| {
            let sample = json!({"id": "ab", "weight": weight, "strength": strength});
            let mut direct = json!({"id": "direct", "parameterIds": ["s"], "targetPartIds": [],
                "targetGlueIds": ["ab"], "keyforms": [{"values": [1], "parts": [], "glue": [sample]}]});
            let mut legacy = json!({"id": "legacy", "parameterIds": ["s"], "targetPartIds": ["a"],
                "keyforms": [{"values": [1], "parts": [{"partId": "a", "vertices": [], "glue": [sample]}]}]});
            if let Some(range) = range {
                direct["keyformRange"] = json!(range);
                legacy["keyformRange"] = json!(range);
            }
            [direct, legacy].map(|binding| {
                accepts(json!({"glue": [connection("ab", ("a", 0), ("b", 0))],
                    "parameterBindings": [binding]}))
            })
        };
        assert_eq!(binding(None, 0.5, 0.5), [true, true]);
        assert_eq!(binding(None, 0.5, -0.5), [false, false]);
        assert_eq!(binding(None, 0.5, 2.0), [false, false]);
        assert_eq!(binding(Some("unbounded"), 0.5, -0.5), [true, true]);
        assert_eq!(binding(Some("unbounded"), 0.5, 2.0), [true, true]);
        assert_eq!(binding(Some("unbounded"), 1.5, 0.5), [false, false]);
    }
}
