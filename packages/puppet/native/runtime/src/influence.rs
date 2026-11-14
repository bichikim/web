//! Binding influence curves (`deformation/influence.ts`).

use std::collections::HashMap;

use poffo_format::document::{
    InfluenceMode, KeyToleranceUnit, KeyformSampling, Parameter, ParameterBinding,
    ParameterInfluence,
};
use poffo_format::resolve_parameter_value;

use crate::grid_keyform::{DEFAULT_KEY_TOLERANCE, GridSpace, with_precision};
use crate::keyform::{KeyformSample, Segment, locate_one_by};

/// One influence curve over a known parameter.
#[derive(Debug, Clone)]
struct Relation {
    parameter: usize,
    curve: ParameterInfluence,
    /// The curve as a one-axis keyform grid, for the multiply rule.
    grid: Option<GridSpace>,
}

/// A binding's influence curves and how they combine.
#[derive(Debug, Clone, Default)]
pub(crate) struct BindingInfluence {
    relations: Vec<Relation>,
    sampling: Option<KeyformSampling>,
}

impl BindingInfluence {
    pub(crate) fn new(
        binding: &ParameterBinding,
        parameter_index: &HashMap<String, usize>,
        parameters: &[Parameter],
    ) -> Self {
        let multiply = binding.influence_mode == Some(InfluenceMode::Multiply);
        let relations = binding
            .influences
            .iter()
            .flatten()
            .filter_map(|curve| {
                let parameter = *parameter_index.get(&curve.parameter_id)?;
                let grid = multiply.then(|| {
                    GridSpace::from_forms(
                        curve.points.iter().map(|p| vec![p.value]).collect(),
                        vec![parameters.get(parameter).and_then(Parameter::repeat_range)],
                        binding.sampling.unwrap_or_default(),
                    )
                });
                Some(Relation {
                    parameter,
                    curve: curve.clone(),
                    grid,
                })
            })
            .collect();
        Self {
            relations,
            sampling: binding.sampling,
        }
    }

    /// `getBindingInfluence`: the minimum curve weight, or with the multiply rule the product
    /// of curves sampled as keyform grids (`discrete` keeps each curve's lower key).
    pub(crate) fn weight(&self, parameters: &[Parameter], values: &[f64], discrete: bool) -> f64 {
        self.relations.iter().fold(1.0, |weight, relation| {
            let Some(parameter) = parameters.get(relation.parameter) else {
                return weight;
            };
            let input = values.get(relation.parameter).copied();
            match &relation.grid {
                Some(grid) => {
                    let value = resolve_parameter_value(parameter, input);
                    let weights: Vec<[f64; 1]> =
                        relation.curve.points.iter().map(|p| [p.weight]).collect();
                    let sample = KeyformSample::Grid(grid.locate([value, 0.0, 0.0], discrete));
                    let sampled =
                        crate::keyform::blend(sample, |k| weights.get(k).map(|w| &w[..]), &[1.0]);
                    weight * sampled.first().copied().unwrap_or(1.0)
                }
                None => {
                    let value = input
                        .filter(|v| v.is_finite())
                        .map_or(parameter.default_value, |v| {
                            v.clamp(parameter.minimum, parameter.maximum)
                        });
                    weight.min(sample_influence(
                        &relation.curve,
                        value,
                        self.sampling.as_ref(),
                    ))
                }
            }
        })
    }
}

/// Curve weight at `value` (`sampleInfluence`), holding the end weights outside the curve.
/// Float32 continuous precision rounds the input; parameter-unit tolerance snaps it onto a
/// nearby curve point.
pub(crate) fn sample_influence(
    relation: &ParameterInfluence,
    value: f64,
    sampling: Option<&KeyformSampling>,
) -> f64 {
    let rounded = sampling
        .and_then(|s| s.continuous_precision)
        .map_or(value, |precision| with_precision(value, precision));
    let points = &relation.points;
    let input = match sampling {
        Some(policy) if policy.key_tolerance_unit == Some(KeyToleranceUnit::Parameter) => {
            let tolerance = policy.key_tolerance.unwrap_or(DEFAULT_KEY_TOLERANCE);
            points
                .iter()
                .find(|p| (p.value - rounded).abs() < tolerance)
                .map_or(rounded, |p| p.value)
        }
        _ => rounded,
    };
    match locate_one_by(points, |p| p.value, input, None) {
        None => 1.0,
        Some(Segment::At(key)) => points[key].weight,
        Some(Segment::Between(previous, next, progress)) => {
            let (previous, next) = (points[previous], points[next]);
            previous.weight + (next.weight - previous.weight) * progress
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use poffo_format::document::{InfluencePoint, NumberPrecision};

    fn curve() -> ParameterInfluence {
        ParameterInfluence {
            parameter_id: "p".into(),
            points: vec![
                InfluencePoint {
                    value: 0.0,
                    weight: 0.0,
                },
                InfluencePoint {
                    value: 1.0,
                    weight: 1.0,
                },
            ],
        }
    }

    #[test]
    fn influence_curve_interpolates_and_holds_ends() {
        let relation = curve();
        assert_eq!(sample_influence(&relation, -1.0, None), 0.0);
        assert_eq!(sample_influence(&relation, 0.25, None), 0.25);
        assert_eq!(sample_influence(&relation, 9.0, None), 1.0);
    }

    #[test]
    fn parameter_tolerance_snaps_onto_curve_points() {
        let policy = KeyformSampling {
            key_tolerance: Some(0.01),
            key_tolerance_unit: Some(KeyToleranceUnit::Parameter),
            ..KeyformSampling::default()
        };
        assert_eq!(sample_influence(&curve(), 0.995, Some(&policy)), 1.0);
        assert_eq!(sample_influence(&curve(), 0.5, Some(&policy)), 0.5);
    }

    #[test]
    fn float32_precision_rounds_the_input() {
        let policy = KeyformSampling {
            continuous_precision: Some(NumberPrecision::Float32),
            ..KeyformSampling::default()
        };
        // On the identity curve the weight is the input itself.
        assert_eq!(
            sample_influence(&curve(), 0.1, Some(&policy)),
            f64::from(0.1_f32)
        );
        assert_eq!(sample_influence(&curve(), 0.1, None), 0.1);
    }
}
