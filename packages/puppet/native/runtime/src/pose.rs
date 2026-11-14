//! Pose group selection and cross-fades (`internal/pose.ts`).

use poffo_format::document::{DEFAULT_POSE_FADE_TIME, Document, PoseGroup};
use poffo_format::resolve_parameter_value;

/// Index of the entry nearest to `value`; ties pick the first.
pub(crate) fn select_entry(group: &PoseGroup, value: f64) -> usize {
    (0..group.entries.len()).fold(0, |best, index| {
        if (group.entries[index].value - value).abs() < (group.entries[best].value - value).abs() {
            index
        } else {
            best
        }
    })
}

fn fade(
    group: &PoseGroup,
    selected: usize,
    previous: Option<&[f64]>,
    delta: f64,
    settle: bool,
) -> Vec<f64> {
    let jump = || {
        (0..group.entries.len())
            .map(|i| if i == selected { 1.0 } else { 0.0 })
            .collect()
    };
    let Some(previous) = previous.filter(|p| !settle && p.len() == group.entries.len()) else {
        return jump();
    };
    let duration = group.fade_time.unwrap_or(DEFAULT_POSE_FADE_TIME);
    let step = if duration > 0.0 {
        delta.max(0.0) / duration
    } else {
        1.0
    };
    let shown = (previous[selected] + step).min(1.0);
    if group.source_parameter_ids.is_some() {
        let maximum_hidden = (1.0 - shown).max(if shown < 1.0 {
            1.0 - 0.15 / (1.0 - shown)
        } else {
            0.0
        });
        return previous
            .iter()
            .enumerate()
            .map(|(index, &weight)| {
                if index == selected {
                    shown
                } else {
                    weight.min(maximum_hidden)
                }
            })
            .collect();
    }
    previous
        .iter()
        .enumerate()
        .map(|(i, &w)| {
            if i == selected {
                shown
            } else {
                (w - step).max(0.0).min(1.0 - shown)
            }
        })
        .collect()
}

/// A pose group's selected entry and entry weights (`PoseGroupState`).
#[derive(Debug, Clone, Default, PartialEq, serde::Serialize, serde::Deserialize)]
pub(crate) struct PoseGroupState {
    selected: usize,
    weights: Vec<f64>,
}

/// Group states indexed like `Document::pose_groups`.
pub(crate) type PoseState = Vec<PoseGroupState>;

/// Advances every group; `previous` of `None` (or `settle`) jumps to the selection. Returns the
/// new state and an opacity multiplier per part (indexed like the document's parts).
pub(crate) fn evaluate(
    document: &Document,
    part_index: impl Fn(&str) -> Option<usize>,
    values: &[f64],
    previous: Option<&PoseState>,
    delta: f64,
    settle: bool,
) -> (PoseState, Vec<Option<f64>>) {
    let mut opacity = vec![None; document.parts.len()];
    let state = document
        .pose_groups
        .iter()
        .enumerate()
        .map(|(g, group)| {
            let Some(p) = document
                .parameters
                .iter()
                .position(|p| p.id == group.parameter_id)
            else {
                return PoseGroupState::default();
            };
            let value = resolve_parameter_value(&document.parameters[p], values.get(p).copied());
            let selected = group
                .source_parameter_ids
                .as_ref()
                .and_then(|ids| {
                    ids.iter().position(|id| {
                        document
                            .parameters
                            .iter()
                            .position(|p| p.id == *id)
                            .is_some_and(|index| {
                                values
                                    .get(index)
                                    .copied()
                                    .unwrap_or(document.parameters[index].default_value)
                                    > 0.001
                            })
                    })
                })
                .unwrap_or_else(|| select_entry(group, value));
            let weights = fade(
                group,
                selected,
                previous
                    .and_then(|s| s.get(g))
                    .map(|state| state.weights.as_slice()),
                delta,
                settle,
            );
            for (entry, &weight) in group.entries.iter().zip(&weights) {
                for part in entry.part_ids.iter().filter_map(|id| part_index(id)) {
                    opacity[part] = Some(weight);
                }
            }
            PoseGroupState { selected, weights }
        })
        .collect();
    (state, opacity)
}

/// `isPoseFading`: whether any group has yet to show only its selected entry, including a
/// selection made without time passing.
pub(crate) fn is_fading(state: &PoseState) -> bool {
    state.iter().any(|group| {
        group.weights.iter().enumerate().any(|(index, &weight)| {
            if index == group.selected {
                weight < 1.0
            } else {
                weight > 0.0
            }
        })
    })
}

#[cfg(test)]
mod tests {
    use poffo_format::document::PoseEntry;

    use super::*;

    #[test]
    fn cubism_background_opacity_follows_coverage_instead_of_linear_fade() {
        let group = PoseGroup {
            source_parameter_ids: Some(vec!["a".into(), "b".into()]),
            entries: vec![
                PoseEntry {
                    part_ids: vec!["a".into()],
                    value: 0.0,
                },
                PoseEntry {
                    part_ids: vec!["b".into()],
                    value: 1.0,
                },
            ],
            fade_time: Some(0.5),
            id: "pose".into(),
            parameter_id: "selector".into(),
        };
        assert_eq!(fade(&group, 1, Some(&[1.0, 0.0]), 0.25, false), [0.7, 0.5]);
        assert_eq!(fade(&group, 1, Some(&[0.7, 0.5]), 0.25, false), [0.0, 1.0]);
    }

    #[test]
    fn selects_nearest_and_cross_fades() {
        let group = PoseGroup {
            source_parameter_ids: None,
            entries: vec![
                PoseEntry {
                    part_ids: vec!["down".into()],
                    value: 0.0,
                },
                PoseEntry {
                    part_ids: vec!["up".into()],
                    value: 1.0,
                },
            ],
            fade_time: Some(0.5),
            id: "arms".into(),
            parameter_id: "pose".into(),
        };
        assert_eq!(select_entry(&group, 0.4), 0);
        assert_eq!(select_entry(&group, 0.5), 0);
        assert_eq!(select_entry(&group, 0.6), 1);
        let start = fade(&group, 0, None, 0.0, true);
        let half = fade(&group, 1, Some(&start), 0.25, false);
        assert_eq!(half, [0.5, 0.5]);
        let state = |selected, weights: &[f64]| PoseGroupState {
            selected,
            weights: weights.to_vec(),
        };
        assert!(is_fading(&vec![state(1, &half)]));
        assert_eq!(fade(&group, 1, Some(&half), 0.25, false), [0.0, 1.0]);
        // A selection made without time passing still has to fade.
        let unchanged = fade(&group, 1, Some(&start), 0.0, false);
        assert_eq!(unchanged, [1.0, 0.0]);
        assert!(is_fading(&vec![state(1, &unchanged)]));
        assert!(!is_fading(&vec![state(0, &start)]));
    }
}
