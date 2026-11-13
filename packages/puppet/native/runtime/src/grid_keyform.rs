//! Tensor-product sampling for explicitly rectangular keyform grids.
use poffo_format::document::{
    KeyToleranceUnit, KeyformSampling, NumberPrecision, Parameter, ParameterBinding,
};

use crate::keyform::{Segment, locate_one};

/// `keyTolerance` when a sampling policy omits it.
pub(crate) const DEFAULT_KEY_TOLERANCE: f64 = 0.0001;

/// `value` rounded through `Float32` when that is the precision, else unchanged.
pub(crate) fn with_precision(value: f64, precision: NumberPrecision) -> f64 {
    if precision == NumberPrecision::Float32 {
        f64::from(value as f32)
    } else {
        value
    }
}

#[derive(Debug, Clone)]
pub(crate) struct GridSpace {
    axes: Vec<Vec<f64>>,
    forms: Vec<Vec<f64>>,
    repeats: Vec<Option<[f64; 2]>>,
    policy: KeyformSampling,
}

#[derive(Debug, Clone, Copy, PartialEq)]
pub(crate) struct GridSample {
    indices: [Option<usize>; 8],
    weights: [f64; 8],
    count: usize,
}

impl GridSpace {
    pub(crate) fn new(binding: &ParameterBinding, parameters: &[Parameter]) -> Self {
        let repeats = binding
            .parameter_ids
            .iter()
            .map(|id| {
                let p = parameters.iter().find(|p| p.id == *id)?;
                (p.repeat == Some(true)).then_some([p.minimum, p.maximum])
            })
            .collect();
        Self::from_forms(
            binding.keyforms.iter().map(|k| k.values.clone()).collect(),
            repeats,
            binding.sampling.unwrap_or_default(),
        )
    }

    /// A grid over `forms` (one value per axis each); `repeats` has one entry per axis.
    pub(crate) fn from_forms(
        forms: Vec<Vec<f64>>,
        repeats: Vec<Option<[f64; 2]>>,
        policy: KeyformSampling,
    ) -> Self {
        let axes = (0..repeats.len())
            .map(|axis| {
                let mut keys: Vec<f64> = forms
                    .iter()
                    .map(|form| form.get(axis).copied().unwrap_or(f64::NAN))
                    .collect();
                keys.sort_by(f64::total_cmp);
                keys.dedup();
                keys
            })
            .collect();
        Self {
            axes,
            forms,
            repeats,
            policy,
        }
    }

    pub(crate) fn locate(&self, values: [f64; 3], discrete: bool) -> GridSample {
        let precision = if discrete {
            self.policy
                .discrete_precision
                .unwrap_or(NumberPrecision::Float32)
        } else {
            self.policy
                .continuous_precision
                .unwrap_or(NumberPrecision::Float64)
        };
        let cast = |v: f64| with_precision(v, precision);
        let tolerance = self.policy.key_tolerance.unwrap_or(DEFAULT_KEY_TOLERANCE);
        let mut corners = vec![(Vec::<f64>::new(), 1.0)];
        for (axis, keys) in self.axes.iter().enumerate() {
            let rounded: Vec<f64> = keys.iter().copied().map(cast).collect();
            let input = cast(values.get(axis).copied().unwrap_or(0.0));
            // Parameter units snap the input onto a nearby key; progress units snap the
            // interval progress onto its ends.
            let parameter_unit =
                self.policy.key_tolerance_unit == Some(KeyToleranceUnit::Parameter);
            let input = if parameter_unit {
                rounded
                    .iter()
                    .copied()
                    .find(|key| (key - input).abs() < tolerance)
                    .unwrap_or(input)
            } else {
                input
            };
            let repeat = self.repeats.get(axis).copied().flatten();
            let Some((from, to, progress)) =
                locate_one(&rounded, input, repeat).map(|segment| match segment {
                    Segment::At(key) => (key, key, 0.0),
                    Segment::Between(from, to, progress) => (from, to, progress),
                })
            else {
                corners.clear();
                break;
            };
            let progress = if parameter_unit {
                progress
            } else if progress <= tolerance {
                0.0
            } else if progress >= 1.0 - tolerance {
                1.0
            } else {
                progress
            };
            let samples = if from == to || discrete {
                vec![(keys[if progress == 1.0 { to } else { from }], 1.0)]
            } else {
                vec![(keys[from], 1.0 - progress), (keys[to], progress)]
            };
            corners = corners
                .into_iter()
                .flat_map(|(coordinates, weight)| {
                    samples.iter().map(move |&(key, share)| {
                        let mut next = coordinates.clone();
                        next.push(key);
                        (next, weight * share)
                    })
                })
                .collect();
        }
        let mut sample = GridSample {
            indices: [None; 8],
            weights: [0.0; 8],
            count: corners.len(),
        };
        for (i, (corner, weight)) in corners.iter().enumerate() {
            sample.indices[i] = self.forms.iter().position(|form| form == corner);
            sample.weights[i] = *weight;
        }
        sample
    }
}

impl GridSample {
    pub(crate) fn blend<'a>(
        &self,
        coordinates: impl Fn(usize) -> Option<&'a [f64]>,
        rest: &'a [f64],
    ) -> Vec<f64> {
        let get = |i: usize| self.indices[i].and_then(&coordinates).unwrap_or(rest);
        if self.count == 0 {
            return rest.to_vec();
        }
        rest.iter()
            .enumerate()
            .map(|(axis, &fallback)| {
                let origin = get(0).get(axis).copied().unwrap_or(fallback);
                (0..self.count).fold(origin, |sum, i| {
                    sum + (get(i).get(axis).copied().unwrap_or(fallback) - origin) * self.weights[i]
                })
            })
            .collect()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;
    fn space(axes: usize) -> GridSpace {
        let forms:Vec<_>=(0..(1<<axes)).map(|bits|json!({"values":(0..axes).map(|i| (bits>>i)&1).collect::<Vec<_>>(),"parts":[]})).collect();
        let binding:ParameterBinding=serde_json::from_value(json!({"id":"b","parameterIds":(["x","y","z"][..axes]),"keyforms":forms,"interpolation":"grid"})).expect("binding");
        GridSpace::new(&binding, &[])
    }
    #[test]
    fn tensor_product_uses_all_eight_corners() {
        let grid = space(3);
        let coordinates = [[0.0]; 8];
        let mut coordinates = coordinates;
        coordinates[7] = [64.0];
        assert_eq!(
            grid.locate([0.25; 3], false)
                .blend(|i| Some(&coordinates[i]), &[0.0]),
            [1.0]
        );
    }
    #[test]
    fn discrete_keys_snap_at_cubism_tolerance() {
        let grid = space(1);
        let coordinates = [[0.0], [1.0]];
        assert_eq!(
            grid.locate([0.5, 0.0, 0.0], true)
                .blend(|i| Some(&coordinates[i]), &[0.0]),
            [0.0]
        );
        assert_eq!(
            grid.locate([1.0 - 1e-8, 0.0, 0.0], true)
                .blend(|i| Some(&coordinates[i]), &[0.0]),
            [1.0]
        );
    }
    #[test]
    fn precision_policy_preserves_keys_when_requested() {
        let mut grid = space(1);
        grid.policy.discrete_precision = Some(NumberPrecision::Float64);
        grid.policy.key_tolerance = Some(0.0);
        let coordinates = [[0.0], [1.0]];
        assert_eq!(
            grid.locate([1.0 - 1e-8, 0.0, 0.0], true)
                .blend(|i| Some(&coordinates[i]), &[0.0]),
            [0.0]
        );
    }
    #[test]
    fn repeating_axes_join_last_key_to_first() {
        let mut grid = space(1);
        grid.axes[0] = vec![0.0, 0.5];
        grid.forms = vec![vec![0.0], vec![0.5]];
        grid.repeats[0] = Some([0.0, 1.0]);
        let coordinates = [[0.0], [1.0]];
        assert_eq!(
            grid.locate([0.75, 0.0, 0.0], false)
                .blend(|i| Some(&coordinates[i]), &[0.0]),
            [0.5]
        );
    }
}
