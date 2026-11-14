//! Cubism draw order (`player/internal/scene-draw-order.ts`): parts and draw order groups sort
//! by their keyed draw order within each level of the scene.

use std::collections::HashMap;

use poffo_format::document::{
    DEFAULT_DRAW_ORDER, Document, DrawOrderRounding, MAXIMUM_DRAW_ORDER, SceneNode,
};

use crate::compose::ParameterValues;
use crate::keyform::blend;
use crate::layers::CompiledGroup;
use crate::model::Model;

/// A sortable scene item: a part, or a draw order group with its own sortable children.
#[derive(Debug, Clone)]
pub(crate) enum DrawItem {
    Part {
        part: usize,
        visible: bool,
    },
    Group {
        group: usize,
        children: Vec<DrawItem>,
    },
}

fn is_draw_order_group(node: &SceneNode) -> bool {
    matches!(node, SceneNode::Group(group) if group
        .properties
        .as_ref()
        .is_some_and(|p| p.draw_order.is_some() || p.offscreen == Some(true)))
}

fn collect(
    nodes: &[SceneNode],
    visible: bool,
    index: &(HashMap<&str, usize>, HashMap<&str, usize>),
    out: &mut Vec<DrawItem>,
) {
    let (parts, groups) = index;
    for node in nodes {
        let visible = visible && node.visible();
        match node {
            SceneNode::Part(part) => {
                if let Some(&part) = parts.get(part.id.as_str()) {
                    out.push(DrawItem::Part { part, visible });
                }
            }
            SceneNode::Group(group) if is_draw_order_group(node) => {
                let mut children = Vec::new();
                collect(&group.children, visible, index, &mut children);
                if let Some(&group) = groups.get(group.id.as_str()) {
                    out.push(DrawItem::Group { group, children });
                }
            }
            _ => collect(node.children(), visible, index, out),
        }
    }
}

/// `usesDrawOrder`: whether any part or group has a draw order, static or keyed.
pub(crate) fn uses_draw_order(document: &Document, groups: &[CompiledGroup]) -> bool {
    let keyed = document.parameter_bindings.iter().any(|binding| {
        binding.keyforms.iter().any(|keyform| {
            keyform.parts.iter().any(|p| {
                p.properties
                    .as_ref()
                    .is_some_and(|p| p.draw_order.is_some())
            }) || keyform
                .groups
                .iter()
                .flatten()
                .any(|g| g.properties.draw_order.is_some())
        })
    });
    document.draw_order_tie_break.is_some()
        || keyed
        || document.parts.iter().any(|p| {
            p.properties
                .as_ref()
                .is_some_and(|p| p.draw_order.is_some())
        })
        || groups.iter().any(|g| g.properties.draw_order.is_some())
}

/// The draw order tree, or `None` when no part or group has a draw order (scene order stands).
pub(crate) fn compile(
    roots: &[SceneNode],
    parts: &HashMap<String, usize>,
    group_ids: &[String],
    uses_draw_order: bool,
) -> Option<Vec<DrawItem>> {
    if !uses_draw_order {
        return None;
    }
    let parts: HashMap<&str, usize> = parts.iter().map(|(id, &i)| (id.as_str(), i)).collect();
    let groups: HashMap<&str, usize> = group_ids
        .iter()
        .enumerate()
        .map(|(i, id)| (id.as_str(), i))
        .collect();
    let mut items = Vec::new();
    collect(roots, true, &(parts, groups), &mut items);
    Some(items)
}

/// Tolerance Cubism adds before truncating a draw order to an integer.
const CUBISM_ORDER_TOLERANCE: f64 = 0.001;

/// Cubism's integer draw order: Float32, plus 0.001 in Float32, then truncation
/// (`drawOrderRounding: cubism`).
fn cubism_draw_order(order: f64) -> f64 {
    let single = f64::from(order as f32);
    f64::from((single + CUBISM_ORDER_TOLERANCE) as f32).trunc()
}

impl Model {
    /// A rest draw order moved by every keyed binding's offset, weighted by influence.
    fn compose_draw_order(
        &self,
        rest: f64,
        keyed: impl Iterator<Item = (usize, Vec<Option<f64>>)>,
        values: &ParameterValues,
    ) -> f64 {
        let mut current = rest;
        for (b, keyed) in keyed {
            let binding = &self.bindings[b];
            let Some(sample) = self.binding_sample(binding, values) else {
                continue;
            };
            let sampled = blend(
                sample,
                |k| keyed.get(k)?.as_ref().map(std::slice::from_ref),
                std::slice::from_ref(&rest),
            );
            let weight = self.binding_influence(binding, values);
            current += (sampled.first().copied().unwrap_or(rest) - rest) * weight;
        }
        let rounded = match self.document.draw_order_rounding {
            Some(DrawOrderRounding::Cubism) => cubism_draw_order(current),
            None => current,
        };
        // `+ 0.0` turns -0 into 0: the web sorts by `a - b`, where they tie, but `total_cmp`
        // would order -0 first.
        rounded.clamp(0.0, MAXIMUM_DRAW_ORDER) + 0.0
    }

    /// `composeParameterPartDrawOrder`.
    fn part_draw_order(&self, part: usize, values: &ParameterValues) -> f64 {
        let rest = self.document.parts[part]
            .properties
            .as_ref()
            .and_then(|p| p.draw_order)
            .unwrap_or(DEFAULT_DRAW_ORDER);
        let keyed = self.parts[part].property_bindings.iter().map(|&b| {
            let keyforms = &self.document.parameter_bindings[b].keyforms;
            let entries = self.bindings[b].part_entries.get(&part);
            let keyed = (0..keyforms.len())
                .map(|k| {
                    let entry = entries?.get(k).copied().flatten()?;
                    let properties = keyforms[k].parts[entry].properties.as_ref()?;
                    Some(properties.draw_order.unwrap_or(rest))
                })
                .collect();
            (b, keyed)
        });
        self.compose_draw_order(rest, keyed, values)
    }

    /// `composeParameterGroupDrawOrder`.
    fn group_draw_order(&self, group: usize, values: &ParameterValues) -> f64 {
        let compiled = &self.groups[group];
        let rest = compiled.properties.draw_order.unwrap_or(DEFAULT_DRAW_ORDER);
        let keyed = compiled.bindings.iter().map(|(b, entries)| {
            let keyforms = &self.document.parameter_bindings[*b].keyforms;
            let keyed = keyforms
                .iter()
                .zip(entries)
                .map(|(keyform, entry)| {
                    let entry = (*entry)?;
                    let properties = &keyform.groups.as_ref()?.get(entry)?.properties;
                    Some(properties.draw_order.unwrap_or(rest))
                })
                .collect();
            (*b, keyed)
        });
        self.compose_draw_order(rest, keyed, values)
    }

    fn sort_items(
        &self,
        items: &[DrawItem],
        values: &ParameterValues,
        out: &mut Vec<(usize, bool)>,
    ) {
        let mut keyed: Vec<(f64, &DrawItem)> = items
            .iter()
            .map(|item| {
                let order = match item {
                    DrawItem::Part { part, .. } => self.part_draw_order(*part, values),
                    DrawItem::Group { group, .. } => self.group_draw_order(*group, values),
                };
                (order, item)
            })
            .collect();
        // Stable: equal draw orders keep scene order.
        fn source(item: &DrawItem) -> usize {
            match item {
                DrawItem::Part { part, .. } => *part,
                DrawItem::Group { children, .. } => {
                    children.iter().map(source).min().unwrap_or(usize::MAX)
                }
            }
        }
        keyed.sort_by(|a, b| {
            a.0.total_cmp(&b.0).then_with(|| {
                if self.document.draw_order_tie_break.is_some() {
                    source(a.1).cmp(&source(b.1))
                } else {
                    std::cmp::Ordering::Equal
                }
            })
        });
        for (_, item) in keyed {
            match item {
                DrawItem::Part { part, visible } => out.push((*part, *visible)),
                DrawItem::Group { children, .. } => self.sort_items(children, values, out),
            }
        }
    }

    /// `getDrawOrderedPartStates`: scene parts in paint order after draw order.
    pub(crate) fn draw_ordered_parts(&self, values: &ParameterValues) -> Vec<(usize, bool)> {
        match &self.draw_order {
            None => self.scene_order.clone(),
            Some(items) => {
                let mut out = Vec::with_capacity(self.scene_order.len());
                self.sort_items(items, values, &mut out);
                out
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::cubism_draw_order;

    #[test]
    fn cubism_draw_orders_truncate_after_the_tolerance() {
        // `Math.trunc(Math.fround(Math.fround(x) + 0.001))`.
        for (order, rounded) in [
            (500.0, 500.0),
            (499.9995, 500.0),
            (499.998, 499.0),
            (0.4, 0.0),
            (1000.0, 1000.0),
        ] {
            assert_eq!(cubism_draw_order(order), rounded, "{order}");
        }
    }
}
