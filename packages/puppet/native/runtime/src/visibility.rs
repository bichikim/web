//! Parameter-driven scene visibility (`player/parameter-visibility.ts`): a node is visible only
//! while every mapped parameter lies in its interval, together with its static `visible` flag
//! and every container above it.

use std::collections::HashMap;

use poffo_format::document::{NumberPrecision, Parameter, ParameterVisibility, SceneNode};
use poffo_format::resolve_parameter_value;

use crate::layers::EffectContainer;

/// One `parameterVisibility` interval with its parameter resolved to an index.
#[derive(Debug, Clone, PartialEq)]
pub(crate) struct VisibilityRange {
    /// `None` for a parameter missing from the document, which hides the node.
    parameter: Option<usize>,
    minimum: f64,
    maximum: f64,
    float32: bool,
}

impl VisibilityRange {
    fn contains(&self, parameters: &[Parameter], values: &[f64]) -> bool {
        let Some(definition) = self.parameter.and_then(|p| parameters.get(p)) else {
            return false;
        };
        let value = resolve_parameter_value(
            definition,
            self.parameter.and_then(|p| values.get(p)).copied(),
        );
        let input = if self.float32 {
            f64::from(value as f32)
        } else {
            value
        };
        input >= self.minimum && input <= self.maximum
    }
}

fn compile(
    ranges: Option<&[ParameterVisibility]>,
    parameter_index: &HashMap<String, usize>,
) -> Vec<VisibilityRange> {
    ranges
        .unwrap_or_default()
        .iter()
        .map(|range| VisibilityRange {
            parameter: parameter_index.get(&range.parameter_id).copied(),
            minimum: range.minimum,
            maximum: range.maximum,
            float32: range.precision == Some(NumberPrecision::Float32),
        })
        .collect()
}

/// The parameter intervals of every scene container and part; static `visible` flags stay with
/// the scene order and layers.
#[derive(Debug, Clone, Default)]
pub(crate) struct SceneVisibility {
    /// Indexed like [`crate::model::Model::groups`].
    containers: Vec<Vec<VisibilityRange>>,
    /// Indexed like the document's parts.
    parts: Vec<Vec<VisibilityRange>>,
}

fn collect_parts<'a>(
    nodes: &'a [SceneNode],
    out: &mut HashMap<&'a str, &'a [ParameterVisibility]>,
) {
    for node in nodes {
        match node {
            SceneNode::Part(part) => {
                if let Some(ranges) = &part.parameter_visibility {
                    out.insert(&part.id, ranges);
                }
            }
            _ => collect_parts(node.children(), out),
        }
    }
}

impl SceneVisibility {
    pub(crate) fn new(
        roots: &[SceneNode],
        containers: &[EffectContainer<'_>],
        part_ids: &[&str],
        parameter_index: &HashMap<String, usize>,
    ) -> Self {
        let mut parts = HashMap::new();
        collect_parts(roots, &mut parts);
        Self {
            containers: containers
                .iter()
                .map(|container| {
                    let ranges = match container {
                        EffectContainer::Group(group) => group.parameter_visibility.as_deref(),
                        EffectContainer::Deformer(node) => node.parameter_visibility.as_deref(),
                    };
                    compile(ranges, parameter_index)
                })
                .collect(),
            parts: part_ids
                .iter()
                .map(|id| compile(parts.get(id).copied(), parameter_index))
                .collect(),
        }
    }

    /// Whether any node maps a parameter interval; otherwise visibility is static.
    pub(crate) fn is_dynamic(&self) -> bool {
        self.containers
            .iter()
            .chain(&self.parts)
            .any(|ranges| !ranges.is_empty())
    }

    /// Per container, whether its own intervals contain the current values.
    pub(crate) fn containers(&self, parameters: &[Parameter], values: &[f64]) -> Vec<bool> {
        self.containers
            .iter()
            .map(|ranges| ranges.iter().all(|r| r.contains(parameters, values)))
            .collect()
    }

    /// Whether the part's own intervals contain the current values.
    pub(crate) fn part(&self, part: usize, parameters: &[Parameter], values: &[f64]) -> bool {
        self.parts
            .get(part)
            .is_none_or(|ranges| ranges.iter().all(|r| r.contains(parameters, values)))
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn parameter() -> Parameter {
        Parameter {
            default_value: 0.0,
            id: "p".into(),
            maximum: 1.0,
            minimum: -1.0,
            name: "p".into(),
            options: None,
            repeat: None,
            group_id: None,
        }
    }

    #[test]
    fn intervals_are_inclusive_and_read_resolved_values() {
        let range = |minimum, maximum, float32| VisibilityRange {
            parameter: Some(0),
            minimum,
            maximum,
            float32,
        };
        let parameters = [parameter()];
        assert!(range(0.0, 0.5, false).contains(&parameters, &[0.5]));
        assert!(!range(0.0, 0.5, false).contains(&parameters, &[0.6]));
        // Missing values use the default; values outside the range clamp first.
        assert!(range(0.0, 0.0, false).contains(&parameters, &[]));
        assert!(range(1.0, 1.0, false).contains(&parameters, &[3.0]));
        // 0.1 as Float32 is just above 0.1 in Float64.
        assert!(range(0.0, 0.1, false).contains(&parameters, &[0.1]));
        assert!(!range(0.0, 0.1, true).contains(&parameters, &[0.1]));
        let missing = VisibilityRange {
            parameter: None,
            ..range(-1.0, 1.0, false)
        };
        assert!(!missing.contains(&parameters, &[0.0]));
    }
}
