//! Expression, pose group and hit area rules (`parse-expression.ts`, `parse-pose.ts`,
//! `parse-hit-area.ts`).

use std::collections::HashSet;

use super::{Check, Index, ensure, is_fade, known_unique, number_key, unique};
use crate::document::{Document, PoseEntry};

/// Whether no two entries share a value; -0 and 0 are one value.
fn values_distinct(entries: &[PoseEntry]) -> bool {
    let mut seen = HashSet::new();
    entries.iter().all(|e| seen.insert(number_key(e.value)))
}

pub(super) fn validate_presets(document: &Document, index: &Index) -> Check {
    let Index {
        parts, parameters, ..
    } = index;

    for (position, expression) in document.expressions.iter().enumerate() {
        ensure(
            !expression.id.is_empty()
                && is_fade(expression.fade_in_time)
                && is_fade(expression.fade_out_time)
                && expression.parameters.iter().all(|p| {
                    parameters.contains_key(p.parameter_id.as_str()) && p.value.is_finite()
                })
                && unique(
                    expression
                        .parameters
                        .iter()
                        .map(|p| p.parameter_id.as_str()),
                ),
            || format!("expressions[{position}]"),
            "needs an id, non-negative fades and distinct known parameters",
        )?;
    }
    ensure(
        unique(document.expressions.iter().map(|e| e.id.as_str())),
        || "expressions".into(),
        "duplicate expression id",
    )?;

    for (position, group) in document.pose_groups.iter().enumerate() {
        ensure(
            !group.id.is_empty()
                && parameters.contains_key(group.parameter_id.as_str())
                && group.source_parameter_ids.as_ref().is_none_or(|ids| {
                    ids.len() == group.entries.len()
                        && ids.iter().all(|id| parameters.contains_key(id.as_str()))
                        && unique(ids.iter().map(String::as_str))
                })
                && is_fade(group.fade_time)
                && !group.entries.is_empty()
                && group
                    .entries
                    .iter()
                    .all(|e| e.value.is_finite() && known_unique(&e.part_ids, parts))
                && values_distinct(&group.entries),
            || format!("poseGroups[{position}]"),
            "needs a known parameter and entries with distinct values and known parts",
        )?;
    }
    let posed = document
        .pose_groups
        .iter()
        .flat_map(|g| g.entries.iter().flat_map(|e| e.part_ids.iter()));
    ensure(
        unique(document.pose_groups.iter().map(|g| g.id.as_str()))
            && unique(posed.map(String::as_str)),
        || "poseGroups".into(),
        "duplicate group id or a part in more than one entry",
    )?;

    for (position, area) in document.hit_areas.iter().enumerate() {
        ensure(
            !area.id.is_empty() && known_unique(&area.part_ids, parts),
            || format!("hitAreas[{position}]"),
            "needs an id and distinct known parts",
        )?;
    }
    ensure(
        unique(document.hit_areas.iter().map(|a| a.id.as_str())),
        || "hitAreas".into(),
        "duplicate hit area id",
    )
}

#[cfg(test)]
mod tests {
    use serde_json::{Value, json};

    use crate::validate::test_support::{accepts, document, merge, parameter, triangle};

    fn valid(presets: Value) -> bool {
        let base = document(json!({
            "parameters": [parameter("p", 0.0, 1.0, 0.0)],
            "parts": [triangle("a"), triangle("b")],
        }));
        accepts(merge(base, presets))
    }

    #[test]
    fn accepts_known_references_and_rejects_typescript_invalid_cases() {
        let expression =
            |parameters: Value| json!({"expressions": [{"id": "e", "parameters": parameters}]});
        assert!(valid(expression(
            json!([{"blend": "add", "parameterId": "p", "value": 1}])
        )));
        assert!(!valid(expression(
            json!([{"blend": "add", "parameterId": "x", "value": 1}])
        )));
        assert!(!valid(expression(
            json!([{"blend": "screen", "parameterId": "p", "value": 1}])
        )));
        assert!(!valid(expression(
            json!([{"blend": "add", "parameterId": "p", "value": 1}, {"blend": "multiply", "parameterId": "p", "value": 1}])
        )));

        let pose = |entries: Value| json!({"poseGroups": [{"id": "g", "parameterId": "p", "entries": entries}]});
        assert!(valid(pose(
            json!([{"value": 0, "partIds": ["a"]}, {"value": 1, "partIds": ["b"]}])
        )));
        assert!(!valid(pose(
            json!([{"value": 0, "partIds": ["a"]}, {"value": 0, "partIds": ["b"]}])
        )));
        assert!(!valid(pose(
            json!([{"value": 0, "partIds": ["a"]}, {"value": 1, "partIds": ["a"]}])
        )));
        assert!(!valid(pose(json!([]))));

        assert!(valid(
            json!({"hitAreas": [{"id": "h", "partIds": ["a", "b"]}]})
        ));
        assert!(!valid(json!({"hitAreas": [{"id": "h", "partIds": []}]})));
        assert!(!valid(
            json!({"hitAreas": [{"id": "h", "partIds": ["a"]}, {"id": "h", "partIds": ["b"]}]})
        ));
    }
}
