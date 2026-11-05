//! Group render properties and group keyforms (`isGroupRenderProperties` in
//! `parse-part-properties.ts`, `parse-group-keyforms.ts`).

use std::collections::HashSet;

use super::{Check, Effect, Index, ensure, is_unbounded, unique};
use crate::document::{Document, GroupRenderProperties};

/// Blend modes and masks composite an isolated layer, so they need `offscreen`.
fn validate_properties(properties: &GroupRenderProperties, index: &Index, path: &str) -> Check {
    let offscreen = properties.offscreen == Some(true);
    ensure(
        offscreen
            || (properties.alpha_blend_mode.is_none()
                && properties.blend_mode.is_none()
                && properties.clipping_mask_ids.is_none()
                && properties.inverted_mask.is_none()),
        || format!("{path}.properties"),
        "blend modes and masks need `offscreen`",
    )?;
    ensure(
        Effect::from(properties).ok(false),
        || format!("{path}.properties"),
        "opacity and color channels must be 0..=1, draw order 0..=1000",
    )?;
    ensure(
        properties.clipping_mask_ids.as_deref().is_none_or(|ids| {
            unique(ids.iter().map(String::as_str))
                && ids.iter().all(|id| index.parts.contains_key(id.as_str()))
        }),
        || format!("{path}.properties.clippingMaskIds"),
        "must be unique ids of parts",
    )
}

pub(super) fn validate_groups(document: &Document, index: &Index) -> Check {
    for group in &index.groups {
        if let Some(properties) = &group.properties {
            validate_properties(properties, index, &format!("scene group `{}`", group.id))?;
        }
    }
    // Draw order groups sort as one unit; only they have a draw order to key.
    let draw_order_groups: HashSet<&str> = index
        .groups
        .iter()
        .filter(|g| {
            g.properties
                .as_ref()
                .is_some_and(|p| p.draw_order.is_some() || p.offscreen == Some(true))
        })
        .map(|g| g.id.as_str())
        .collect();
    for binding in &document.parameter_bindings {
        let path = || format!("binding `{}`", binding.id);
        let unbounded = is_unbounded(binding);
        let ids = binding.target_group_ids.as_deref().unwrap_or_default();
        ensure(
            unique(ids.iter().map(String::as_str))
                && ids.iter().all(|id| index.group_ids.contains(id.as_str())),
            path,
            "targetGroupIds must be unique ids of scene groups",
        )?;
        let targets: HashSet<&str> = ids.iter().map(String::as_str).collect();
        for keyform in &binding.keyforms {
            let entries = keyform.groups.as_deref().unwrap_or_default();
            ensure(
                entries.len() == ids.len()
                    && unique(entries.iter().map(|e| e.group_id.as_str()))
                    && entries.iter().all(|e| {
                        targets.contains(e.group_id.as_str())
                            && Effect::from(&e.properties).ok(unbounded)
                            && (e.properties.draw_order.is_none()
                                || draw_order_groups.contains(e.group_id.as_str()))
                    }),
                path,
                "keyform groups must match targetGroupIds with 0..=1 opacity and colors (unless \
                 unbounded), and key draw order only on draw order groups",
            )?;
        }
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use serde_json::{Value, json};

    use crate::validate::test_support::{accepts, document, parameter, part_node, triangle};

    /// Parts `a` and `b` in group `g` with `properties`, plus `bindings`.
    fn valid(properties: Value, bindings: Value) -> bool {
        accepts(document(json!({
            "parameters": [parameter("p", 0.0, 1.0, 0.0)],
            "parts": [triangle("a"), triangle("b")],
            "scene": {"roots": [part_node("b"), {"id": "g", "kind": "group", "name": "g",
                "visible": true, "locked": false, "children": [part_node("a")],
                "properties": properties}]},
            "parameterBindings": bindings,
        })))
    }

    #[test]
    fn group_properties_need_offscreen_for_compositing() {
        assert!(valid(
            json!({"opacity": 0.5, "multiplyColor": [1, 0.5, 0.5]}),
            json!([])
        ));
        assert!(valid(
            json!({"offscreen": true, "blendMode": "add-glow", "alphaBlendMode": "atop", "clippingMaskIds": ["b"]}),
            json!([])
        ));
        assert!(!valid(json!({"blendMode": "overlay"}), json!([])));
        assert!(!valid(
            json!({"offscreen": true, "clippingMaskIds": ["x"]}),
            json!([])
        ));
        assert!(!valid(json!({"opacity": 2}), json!([])));
    }

    #[test]
    fn group_keyforms_match_their_targets() {
        let binding = |targets: Value, groups: Value| {
            json!([{"id": "k", "parameterIds": ["p"], "targetPartIds": [], "targetGroupIds": targets,
                    "keyforms": [{"values": [0], "parts": [], "groups": groups}]}])
        };
        let entry = json!([{"groupId": "g", "properties": {"opacity": 0.5}}]);
        assert!(valid(json!({}), binding(json!(["g"]), entry.clone())));
        assert!(!valid(json!({}), binding(json!(["g"]), json!([]))));
        assert!(!valid(json!({}), binding(json!(["a"]), entry)));
        assert!(!valid(
            json!({}),
            binding(
                json!(["g"]),
                json!([{"groupId": "g", "properties": {"opacity": -1}}])
            )
        ));
    }

    #[test]
    fn unbounded_group_keyforms_leave_display_ranges() {
        // `isKeyedProperties(..., binding.keyformRange === 'unbounded')`.
        let binding = |range: Option<&str>, properties: Value| {
            let mut binding = json!({"id": "k", "parameterIds": ["p"], "targetPartIds": [],
                "targetGroupIds": ["g"],
                "keyforms": [{"values": [0], "parts": [], "groups": [{"groupId": "g", "properties": properties}]}]});
            if let Some(range) = range {
                binding["keyformRange"] = json!(range);
            }
            json!([binding])
        };
        let outside = [
            json!({"opacity": 2}),
            json!({"multiplyColor": [1, -0.5, 1]}),
            json!({"screenColor": [0, 1.5, 0]}),
            json!({"drawOrder": 1500}),
        ];
        for properties in outside {
            let group = json!({"drawOrder": 500});
            assert!(!valid(group.clone(), binding(None, properties.clone())));
            assert!(valid(group, binding(Some("unbounded"), properties)));
        }
        // Group rest properties stay bounded.
        assert!(!valid(
            json!({"opacity": 2}),
            binding(Some("unbounded"), json!({}))
        ));
    }

    #[test]
    fn draw_orders_stay_in_range_and_key_only_draw_order_groups() {
        let keyed = json!([{"id": "k", "parameterIds": ["p"], "targetPartIds": [], "targetGroupIds": ["g"],
                            "keyforms": [{"values": [0], "parts": [],
                                          "groups": [{"groupId": "g", "properties": {"drawOrder": 200}}]}]}]);
        assert!(valid(json!({"drawOrder": 500}), keyed.clone()));
        assert!(valid(json!({"offscreen": true}), keyed.clone()));
        assert!(!valid(json!({}), keyed));
        assert!(!valid(json!({"drawOrder": 1001}), json!([])));
    }
}
