//! Scene parameter visibility (`parse-parameter-visibility.ts`).

use super::{Check, Index, ensure};
use crate::document::{Document, ParameterVisibility, Scene};

fn range_ok(range: &ParameterVisibility, index: &Index) -> bool {
    !range.parameter_id.is_empty()
        && index.parameters.contains_key(range.parameter_id.as_str())
        && range.minimum.is_finite()
        && range.maximum.is_finite()
        && range.minimum <= range.maximum
}

/// Every interval names a known parameter and has finite bounds with `minimum <= maximum`.
pub(super) fn validate_parameter_visibility(document: &Document, index: &Index) -> Check {
    document
        .scene
        .iter()
        .flat_map(Scene::nodes)
        .try_for_each(|node| {
            ensure(
                node.parameter_visibility()
                    .iter()
                    .all(|range| range_ok(range, index)),
                || format!("scene node `{}` parameterVisibility", node.id()),
                "needs known parameters and finite intervals with minimum <= maximum",
            )
        })
}

#[cfg(test)]
mod tests {
    use serde_json::{Value, json};

    use crate::validate::test_support::{self, accepts, merge, parameter, part_node};

    fn document(visibility: Value, mesh: Value) -> bool {
        accepts(test_support::document(json!({
            "parameters": [parameter("p", 0.0, 1.0, 0.0)],
            "parts": [merge(test_support::triangle("a"), json!({"mesh": mesh}))],
            "scene": {"roots": [{"kind": "group", "id": "g", "name": "g", "visible": true,
                "locked": false, "parameterVisibility": visibility,
                "children": [part_node("a")]}]},
        })))
    }

    fn triangle() -> Value {
        json!({"vertices": [0, 0, 1, 0, 0, 1], "uvs": [0, 0, 1, 0, 0, 1], "indices": [0, 1, 2]})
    }

    #[test]
    fn intervals_name_known_parameters_in_order() {
        let range = |id: &str, minimum: f64, maximum: f64| {
            json!([{"parameterId": id, "minimum": minimum, "maximum": maximum,
                "precision": "float32"}])
        };
        assert!(document(Value::Null, triangle()));
        assert!(document(range("p", 0.0, 0.5), triangle()));
        assert!(document(range("p", 0.5, 0.5), triangle()));
        assert!(!document(range("p", 0.6, 0.5), triangle()));
        assert!(!document(range("missing", 0.0, 0.5), triangle()));
        assert!(!document(range("", 0.0, 0.5), triangle()));
        assert!(!document(
            json!([{"parameterId": "p", "minimum": 0, "maximum": 1,
            "precision": "float16"}]),
            triangle()
        ));
    }

    #[test]
    fn index_validated_meshes_may_collapse_or_draw_nothing() {
        // `validationSpace: indices` keeps compiled meshes that overlap or collapse, and glue
        // anchors may carry no triangles.
        let collapsed = json!({"vertices": [0, 0, 0, 0, 0, 0], "uvs": [0, 0, 0, 0, 0, 0],
            "indices": [0, 1, 2], "validationSpace": "indices"});
        assert!(document(Value::Null, collapsed));
        let empty = json!({"vertices": [0, 0, 1, 0, 0, 1], "uvs": [0, 0, 1, 0, 0, 1],
            "indices": []});
        assert!(document(Value::Null, empty));
        let unknown = json!({"vertices": [0, 0, 1, 0, 0, 1], "uvs": [0, 0, 1, 0, 0, 1],
            "indices": [0, 1, 2], "validationSpace": "planar"});
        assert!(!document(Value::Null, unknown));
        let out_of_range = json!({"vertices": [0, 0, 1, 0, 0, 1], "uvs": [0, 0, 1, 0, 0, 1],
            "indices": [0, 1, 3], "validationSpace": "indices"});
        assert!(!document(Value::Null, out_of_range));
    }

    #[test]
    fn compiled_meshes_without_triangles_may_have_fewer_than_three_vertices() {
        for vertices in [json!([]), json!([0, 0]), json!([0, 0, 1, 1])] {
            let compiled = json!({"vertices": vertices, "uvs": vertices, "indices": [],
                "validationSpace": "indices"});
            assert!(document(Value::Null, compiled.clone()), "{vertices}");
            let mut planar = compiled;
            planar.as_object_mut().map(|m| m.remove("validationSpace"));
            assert!(
                !document(Value::Null, planar),
                "{vertices} without indices space"
            );
        }
        let with_triangle = json!({"vertices": [0, 0, 1, 1], "uvs": [0, 0, 1, 1],
            "indices": [0, 1, 0], "validationSpace": "indices"});
        assert!(!document(Value::Null, with_triangle));
    }
}
