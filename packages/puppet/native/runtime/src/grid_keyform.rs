//! Tensor-product sampling for explicitly rectangular keyform grids.
use poffo_format::document::{
    KeyToleranceUnit, KeyformSampling, NumberPrecision, Parameter, ParameterBinding,
};

use crate::keyform::{Segment, locate_one};
use std::collections::HashMap;

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
    float32_axes: Vec<Vec<f64>>,
    forms: Vec<Vec<f64>>,
    form_indices: Option<HashMap<[u64; 3], usize>>,
    repeats: Vec<Option<[f64; 2]>>,
    policy: KeyformSampling,
}

#[derive(Debug, Clone, Copy, PartialEq)]
pub(crate) struct GridSample {
    indices: [Option<usize>; 8],
    weights: [f64; 8],
    count: usize,
}

/// Borrowed corner channels resolved once when creating a frame's grid view.
#[derive(Clone)]
pub(crate) struct GridCoordinates<'a> {
    channels: [&'a [f64]; 8],
    weights: [f64; 8],
    count: usize,
}
impl GridCoordinates<'_> {
    #[inline]
    pub(crate) fn coordinate(&self, axis: usize, fallback: f64) -> f64 {
        if self.count == 0 {
            return fallback;
        }
        let get = |i: usize| self.channels[i].get(axis).copied().unwrap_or(fallback);
        let origin = get(0);
        (0..self.count).fold(origin, |sum, i| sum + (get(i) - origin) * self.weights[i])
    }
}

/// Match f64 equality for authored key coordinates: signed zeros are equal, NaNs never match.
fn form_key(values: &[f64]) -> Option<[u64; 3]> {
    if values.len() > 3 || values.iter().any(|value| value.is_nan()) {
        return None;
    }
    let mut key = [0; 3];
    for (axis, value) in values.iter().enumerate() {
        key[axis] = if *value == 0.0 { 0 } else { value.to_bits() };
    }
    Some(key)
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
        let axes: Vec<Vec<f64>> = (0..repeats.len())
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
        let float32_axes = axes
            .iter()
            .map(|keys| {
                keys.iter()
                    .map(|&key| with_precision(key, NumberPrecision::Float32))
                    .collect()
            })
            .collect();
        // Small channels are cheaper to scan; large grids resolve corners without scanning
        // every authored form on each frame. First matching duplicate retains precedence.
        let form_indices = (forms.len() > 16).then(|| {
            let mut indices = HashMap::with_capacity(forms.len());
            for (index, form) in forms.iter().enumerate() {
                if form.len() == repeats.len()
                    && let Some(key) = form_key(form)
                {
                    indices.entry(key).or_insert(index);
                }
            }
            indices
        });
        Self {
            axes,
            float32_axes,
            forms,
            form_indices,
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
        // A binding has at most three axes and eight tensor corners. Keep its working
        // set on the stack instead of allocating vectors for every branch of every frame.
        let mut corners = [([0.0; 3], 0.0); 8];
        corners[0].1 = 1.0;
        let mut count = 1;
        for (axis, keys) in self.axes.iter().enumerate() {
            let rounded = if precision == NumberPrecision::Float32 {
                &self.float32_axes[axis]
            } else {
                keys
            };
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
                locate_one(rounded, input, repeat).map(|segment| match segment {
                    Segment::At(key) => (key, key, 0.0),
                    Segment::Between(from, to, progress) => (from, to, progress),
                })
            else {
                count = 0;
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
            let (samples, sample_count) = if from == to || discrete {
                (
                    [
                        (keys[if progress == 1.0 { to } else { from }], 1.0),
                        (0.0, 0.0),
                    ],
                    1,
                )
            } else {
                ([(keys[from], 1.0 - progress), (keys[to], progress)], 2)
            };
            let mut next = [([0.0; 3], 0.0); 8];
            for (corner, &(coordinates, weight)) in corners[..count].iter().enumerate() {
                for (index, &(key, share)) in samples[..sample_count].iter().enumerate() {
                    let mut coordinates = coordinates;
                    coordinates[axis] = key;
                    next[corner * sample_count + index] = (coordinates, weight * share);
                }
            }
            corners = next;
            count *= sample_count;
        }
        let mut sample = GridSample {
            indices: [None; 8],
            weights: [0.0; 8],
            count,
        };
        for (i, (corner, weight)) in corners[..count].iter().enumerate() {
            let coordinates = &corner[..self.axes.len()];
            sample.indices[i] = match &self.form_indices {
                Some(indices) => form_key(coordinates).and_then(|key| indices.get(&key).copied()),
                None => self
                    .forms
                    .iter()
                    .position(|form| form.as_slice() == coordinates),
            };
            sample.weights[i] = *weight;
        }
        sample
    }
}

impl GridSample {
    pub(crate) fn coordinates<'a>(
        &self,
        coordinates: impl Fn(usize) -> Option<&'a [f64]>,
        rest: &'a [f64],
    ) -> GridCoordinates<'a> {
        GridCoordinates {
            channels: self
                .indices
                .map(|index| index.and_then(&coordinates).unwrap_or(rest)),
            weights: self.weights,
            count: self.count,
        }
    }

    pub(crate) fn blend<'a>(
        &self,
        coordinates: impl Fn(usize) -> Option<&'a [f64]>,
        rest: &'a [f64],
    ) -> Vec<f64> {
        if rest.is_empty() || self.count == 0 {
            return rest.to_vec();
        }
        let channels = self.coordinates(coordinates, rest);
        let origin = channels.channels[0];
        let mut blended: Vec<_> = rest
            .iter()
            .enumerate()
            .map(|(axis, &fallback)| origin.get(axis).copied().unwrap_or(fallback))
            .collect();
        for (points, weight) in channels.channels[..channels.count]
            .iter()
            .zip(channels.weights)
        {
            for (axis, value) in blended.iter_mut().enumerate() {
                let fallback = rest[axis];
                let start = origin.get(axis).copied().unwrap_or(fallback);
                *value += (points.get(axis).copied().unwrap_or(fallback) - start) * weight;
            }
        }
        blended
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;
    /// The dense blend's origin-delta arithmetic, evaluated for only one coordinate.
    fn coordinate<'a>(
        sample: &GridSample,
        coordinates: impl Fn(usize) -> Option<&'a [f64]>,
        rest: &[f64],
        axis: usize,
    ) -> f64 {
        let fallback = rest[axis];
        if sample.count == 0 {
            return fallback;
        }
        let get = |i: usize| {
            sample.indices[i]
                .and_then(&coordinates)
                .and_then(|points| points.get(axis))
                .copied()
                .unwrap_or(fallback)
        };
        let origin = get(0);
        (0..sample.count).fold(origin, |sum, i| sum + (get(i) - origin) * sample.weights[i])
    }
    fn space(axes: usize) -> GridSpace {
        let forms:Vec<_>=(0..(1<<axes)).map(|bits|json!({"values":(0..axes).map(|i| (bits>>i)&1).collect::<Vec<_>>(),"parts":[]})).collect();
        let binding:ParameterBinding=serde_json::from_value(json!({"id":"b","parameterIds":(["x","y","z"][..axes]),"keyforms":forms,"interpolation":"grid"})).expect("binding");
        GridSpace::new(&binding, &[])
    }
    #[test]
    fn lookup_preserves_shuffled_forms_duplicate_precedence_and_signed_zero() {
        let forms = vec![
            vec![1.0, 1.0],
            vec![0.0, 1.0],
            vec![-0.0, 0.0],
            vec![1.0, 0.0],
            vec![0.0, -0.0],
        ];
        for forms in [
            forms.clone(),
            forms.iter().cloned().cycle().take(20).collect(),
        ] {
            let grid = GridSpace::from_forms(forms, vec![None; 2], KeyformSampling::default());
            let values = [[7.0], [5.0], [2.0], [3.0], [99.0]];
            for (input, expected) in [
                ([0.0, -0.0, 0.0], 2.0),
                ([1.0, 0.0, 0.0], 3.0),
                ([0.0, 1.0, 0.0], 5.0),
                ([1.0, 1.0, 0.0], 7.0),
                ([0.5, 0.5, 0.0], 4.25),
            ] {
                assert_eq!(
                    grid.locate(input, false)
                        .blend(|index| Some(&values[index]), &[0.0]),
                    [expected]
                );
            }
        }
    }

    #[test]
    fn incomplete_forms_keep_missing_corners_as_rest() {
        let grid = GridSpace::from_forms(
            [vec![0.0, 0.0], vec![1.0, 1.0]]
                .into_iter()
                .cycle()
                .take(20)
                .collect(),
            vec![None; 2],
            KeyformSampling::default(),
        );
        let values = [[2.0], [6.0]];
        assert_eq!(
            grid.locate([0.5, 0.5, 0.0], false)
                .blend(|index| Some(&values[index]), &[4.0]),
            [4.0]
        );
    }

    #[test]
    fn prepared_corners_preserve_missing_channels_and_signed_zero() {
        let grid = space(1);
        let rest = [-0.0, 0.13, 0.71];
        let keys = [[0.17, 0.31, 0.67], [-0.0, 0.0, 0.0]];
        for progress in [0.0, 0.37, 1.0] {
            for missing in [false, true] {
                let sample = grid.locate([progress, 0.0, 0.0], false);
                let coordinates = |index| {
                    if missing && index == 0 {
                        None
                    } else if index == 1 {
                        Some(&keys[1][..1])
                    } else {
                        Some(&keys[0][..])
                    }
                };
                let prepared = sample.coordinates(coordinates, &rest);
                let expected: Vec<_> = (0..rest.len())
                    .map(|axis| coordinate(&sample, coordinates, &rest, axis))
                    .collect();
                assert_eq!(
                    (0..rest.len())
                        .map(|axis| prepared.coordinate(axis, rest[axis]).to_bits())
                        .collect::<Vec<_>>(),
                    expected.iter().map(|v| v.to_bits()).collect::<Vec<_>>()
                );
                assert_eq!(
                    sample
                        .blend(coordinates, &rest)
                        .iter()
                        .map(|v| v.to_bits())
                        .collect::<Vec<_>>(),
                    expected.iter().map(|v| v.to_bits()).collect::<Vec<_>>()
                );
            }
        }
        let empty = GridSample {
            indices: [None; 8],
            weights: [0.0; 8],
            count: 0,
        };
        let prepared = empty.coordinates(|_| None, &rest);
        assert_eq!(prepared.coordinate(0, rest[0]).to_bits(), rest[0].to_bits());
        assert_eq!(
            empty
                .blend(|_| panic!("empty grid must not resolve keyforms"), &rest)
                .iter()
                .map(|v| v.to_bits())
                .collect::<Vec<_>>(),
            rest.iter().map(|v| v.to_bits()).collect::<Vec<_>>()
        );
    }

    #[test]
    fn dense_channels_resolve_keyforms_once_per_corner() {
        let grid = space(3);
        let sample = grid.locate([0.25, 0.75, 0.5], false);
        for length in [128, 4096] {
            let rest = vec![-0.0; length];
            let values: Vec<Vec<f64>> = (0..8)
                .map(|key| {
                    (0..length)
                        .map(|axis| (key * length + axis) as f64 * 0.017)
                        .collect()
                })
                .collect();
            let lookups = std::cell::Cell::new(0);
            let coordinates = |key: usize| {
                lookups.set(lookups.get() + 1);
                Some(values[key].as_slice())
            };
            let expected: Vec<_> = (0..rest.len())
                .map(|axis| coordinate(&sample, |key| Some(values[key].as_slice()), &rest, axis))
                .collect();
            let actual = sample.blend(coordinates, &rest);
            assert_eq!(
                actual.iter().map(|v| v.to_bits()).collect::<Vec<_>>(),
                expected.iter().map(|v| v.to_bits()).collect::<Vec<_>>()
            );
            assert_eq!(
                lookups.get(),
                8,
                "keyform lookup must not scale with coordinate count"
            );
        }
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
    fn tensor_corners_keep_axis_order_and_zero_weight_endpoints() {
        let grid = space(3);
        let sample = grid.locate([0.25, 0.75, 0.5], false);
        assert_eq!(
            sample.indices,
            [
                Some(0),
                Some(4),
                Some(2),
                Some(6),
                Some(1),
                Some(5),
                Some(3),
                Some(7)
            ]
        );
        assert_eq!(
            sample.weights,
            [
                0.09375, 0.09375, 0.28125, 0.28125, 0.03125, 0.03125, 0.09375, 0.09375
            ]
        );
        let edge = grid.locate([1e-8, 0.75, 0.5], false);
        assert_eq!(edge.count, 8);
        assert_eq!(&edge.weights[4..], &[0.0; 4]);
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
        let grid = GridSpace::from_forms(
            vec![vec![0.0], vec![0.5]],
            vec![Some([0.0, 1.0])],
            KeyformSampling::default(),
        );
        let coordinates = [[0.0], [1.0]];
        assert_eq!(
            grid.locate([0.75, 0.0, 0.0], false)
                .blend(|i| Some(&coordinates[i]), &[0.0]),
            [0.5]
        );
    }
}
