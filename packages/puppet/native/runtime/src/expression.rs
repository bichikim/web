//! Expression fades and blending (`playback/expression-playback.ts` and
//! `playback/apply-cubism-expression-layers.ts`).

use poffo_format::document::{
    DEFAULT_EXPRESSION_FADE_TIME, Easing, Expression, ExpressionBlend, ExpressionComposition,
    Parameter,
};

use crate::motion::{ease, ease_sine};

/// One expression (index into the document) with its eased fade weight, oldest first.
#[derive(Debug, Clone, Copy, PartialEq)]
pub(crate) struct ExpressionLayer {
    pub(crate) stack: bool,
    pub(crate) expression: usize,
    pub(crate) weight: f64,
    /// Overall amount of a Cubism composition (`fadeInWeight`); `None` uses `weight`.
    pub(crate) fade_in_weight: Option<f64>,
}

/// `ExpressionEntry.fading`: a Cubism expression replaced by another keeps its fade-in while
/// the next one fades in.
#[derive(Debug, Clone, Copy, PartialEq, Eq, serde::Serialize, serde::Deserialize)]
enum Fading {
    In,
    Out,
    Replaced,
}

#[derive(Debug, Clone, Copy, PartialEq, serde::Serialize, serde::Deserialize)]
struct Entry {
    #[serde(default)]
    stack: bool,
    expression: usize,
    /// `composition: cubism`, fixed for the entry's lifetime since models are immutable.
    cubism: bool,
    fading: Fading,
    /// Linear fade progress 0..=1.
    progress: f64,
    /// Linear release 1..=0 of a Cubism entry; `None` reads as 1.
    release: Option<f64>,
}

impl Entry {
    fn release(&self) -> f64 {
        self.release.unwrap_or(1.0)
    }
}

#[derive(Debug, Clone, Default, serde::Serialize, serde::Deserialize)]
pub(crate) struct ExpressionPlayback {
    entries: Vec<Entry>,
}

fn fade_step(seconds: Option<f64>, delta: f64) -> f64 {
    let duration = seconds.unwrap_or(DEFAULT_EXPRESSION_FADE_TIME);
    if duration > 0.0 {
        delta / duration
    } else {
        f64::INFINITY
    }
}

fn is_cubism(expression: &Expression) -> bool {
    expression.composition == Some(ExpressionComposition::Cubism)
}

impl ExpressionPlayback {
    /// Cross-fades to `expression` (an index) or, with `None`, fades everything out. Poffo
    /// entries whose fade-out time is zero drop at once, and a zero fade-in applies at full
    /// weight; a Cubism target replaces the previous Cubism entries, or clears every entry when
    /// its fade-in is zero.
    pub(crate) fn set(&mut self, expression: Option<usize>, expressions: &[Expression]) {
        if let Some(active) = self.entries.iter().find(|e| e.fading == Fading::In)
            && Some(active.expression) == expression
        {
            return;
        }
        let target = expression.and_then(|index| Some((index, expressions.get(index)?)));
        if target.is_some_and(|(_, e)| is_cubism(e) && e.fade_in_time == Some(0.0)) {
            self.entries.clear();
        }
        let fade_out = |index: usize| {
            expressions
                .get(index)
                .and_then(|e| e.fade_out_time)
                .unwrap_or(DEFAULT_EXPRESSION_FADE_TIME)
        };
        let replacing = target.is_some();
        self.entries
            .retain(|e| (e.cubism && replacing) || fade_out(e.expression) > 0.0);
        for entry in &mut self.entries {
            entry.fading = if entry.cubism && replacing && entry.fading != Fading::Out {
                Fading::Replaced
            } else {
                Fading::Out
            };
        }
        if let Some((index, target)) = target {
            self.entries.push(Entry {
                stack: false,
                expression: index,
                cubism: is_cubism(target),
                fading: Fading::In,
                progress: if target.fade_in_time == Some(0.0) {
                    1.0
                } else {
                    0.0
                },
                release: None,
            });
        }
    }

    pub(crate) fn current(&self) -> Option<usize> {
        self.entries
            .iter()
            .find(|e| e.fading == Fading::In)
            .map(|e| e.expression)
    }

    pub(crate) fn advance(&mut self, delta: f64, expressions: &[Expression]) {
        if !delta.is_finite() || delta <= 0.0 {
            return;
        }
        for entry in &mut self.entries {
            let Some(expression) = expressions.get(entry.expression) else {
                continue;
            };
            let fade_in = fade_step(expression.fade_in_time, delta);
            let fade_out = fade_step(expression.fade_out_time, delta);
            if entry.cubism && !entry.stack {
                if entry.fading != Fading::Out {
                    entry.progress = (entry.progress + fade_in).min(1.0);
                }
                entry.release = Some(if entry.fading == Fading::In {
                    1.0
                } else {
                    (entry.release() - fade_out).max(0.0)
                });
            } else if entry.fading == Fading::In {
                entry.progress = (entry.progress + fade_in).min(1.0);
            } else {
                entry.progress = (entry.progress - fade_out).max(0.0);
            }
        }
        let active = self
            .entries
            .iter()
            .find(|e| !e.stack && e.fading == Fading::In)
            .map(|e| e.progress);
        self.entries.retain(|e| {
            if e.fading == Fading::In {
                return true;
            }
            if !e.cubism || e.stack {
                return e.progress > 0.0;
            }
            match (e.fading, active) {
                // A replaced Cubism entry lasts until the next one has fully faded in.
                (Fading::Replaced, Some(progress)) => progress < 1.0,
                _ => e.release() > 0.0,
            }
        });
    }

    pub(crate) fn is_animating(&self) -> bool {
        self.entries.iter().any(|e| match e.fading {
            Fading::In => e.progress < 1.0,
            _ if e.cubism && !e.stack => e.release() > 0.0,
            _ => e.progress > 0.0,
        })
    }

    pub(crate) fn layers(&self) -> Vec<ExpressionLayer> {
        let fading_in = self.entries.iter().any(|e| e.fading == Fading::In);
        self.entries
            .iter()
            .map(|e| {
                if !e.cubism || e.stack {
                    return ExpressionLayer {
                        stack: e.stack,
                        expression: e.expression,
                        weight: if e.stack {
                            ease_sine(e.progress)
                        } else {
                            ease(Some(Easing::EaseInOut), e.progress)
                        },
                        fade_in_weight: None,
                    };
                }
                let fade_in = ease_sine(e.progress);
                let weight = fade_in
                    * if e.fading == Fading::In {
                        1.0
                    } else {
                        ease_sine(e.release())
                    };
                ExpressionLayer {
                    stack: false,
                    expression: e.expression,
                    weight,
                    fade_in_weight: Some(if e.fading != Fading::Out && fading_in {
                        fade_in
                    } else {
                        weight
                    }),
                }
            })
            .collect()
    }
}

/// Applies `layers` to the motion-mixed `values` (`applyExpressionLayers`): Cubism composition
/// when every layer is a Cubism expression, else each layer blended in turn.
pub(crate) fn apply_layers(
    parameters: &[Parameter],
    expressions: &[Expression],
    layers: &[ExpressionLayer],
    values: &mut [f64],
) {
    if layers.is_empty() {
        return;
    }
    if layers.iter().any(|layer| layer.stack != layers[0].stack) {
        let mut first = 0;
        while first < layers.len() {
            let mut end = first + 1;
            while end < layers.len() && layers[end].stack == layers[first].stack {
                end += 1;
            }
            apply_layers(parameters, expressions, &layers[first..end], values);
            first = end;
        }
        return;
    }
    if layers[0].stack {
        for (index, parameter) in parameters.iter().enumerate() {
            let base = values
                .get(index)
                .copied()
                .unwrap_or(parameter.default_value);
            let (mut additive, mut multiply, mut overwrite) = (0.0, 1.0, base);
            for layer in layers {
                if let Some(entry) = expressions.get(layer.expression).and_then(|expression| {
                    expression
                        .parameters
                        .iter()
                        .find(|entry| entry.parameter_id == parameter.id)
                }) {
                    match entry.blend {
                        ExpressionBlend::Add => additive += entry.value * layer.weight,
                        ExpressionBlend::Multiply => {
                            multiply *= 1.0 + (entry.value - 1.0) * layer.weight
                        }
                        ExpressionBlend::Overwrite => {
                            overwrite =
                                overwrite * (1.0 - layer.weight) + entry.value * layer.weight
                        }
                    }
                }
            }
            values[index] = overwrite * multiply + additive;
        }
        return;
    }
    if layers
        .iter()
        .all(|l| expressions.get(l.expression).is_some_and(is_cubism))
    {
        apply_cubism_layers(parameters, expressions, layers, values);
        return;
    }
    for layer in layers {
        let Some(expression) = expressions.get(layer.expression) else {
            continue;
        };
        for entry in &expression.parameters {
            let Some(index) = parameters.iter().position(|p| p.id == entry.parameter_id) else {
                continue;
            };
            let Some(value) = values.get_mut(index) else {
                continue;
            };
            let w = layer.weight;
            *value = match entry.blend {
                ExpressionBlend::Add => *value + entry.value * w,
                ExpressionBlend::Multiply => *value * (1.0 + (entry.value - 1.0) * w),
                ExpressionBlend::Overwrite => *value + (entry.value - *value) * w,
            };
        }
    }
}

/// Additive, multiply and overwrite channels of one parameter (Cubism's expression values).
#[derive(Debug, Clone, Copy)]
struct Channels {
    additive: f64,
    multiply: f64,
    overwrite: f64,
}

/// `applyCubismExpressionLayers`: per-parameter channels cross-fade from the oldest layer by
/// each later layer's weight, and the result applies over the original value by the summed
/// fade-in weights (at most 1).
fn apply_cubism_layers(
    parameters: &[Parameter],
    expressions: &[Expression],
    layers: &[ExpressionLayer],
    values: &mut [f64],
) {
    let weight = layers
        .iter()
        .map(|l| l.fade_in_weight.unwrap_or(l.weight))
        .sum::<f64>()
        .min(1.0);
    for (parameter, value) in parameters.iter().zip(values.iter_mut()) {
        let base = *value;
        let mut result = Channels {
            additive: 0.0,
            multiply: 1.0,
            overwrite: base,
        };
        for (index, layer) in layers.iter().enumerate() {
            let entry = expressions.get(layer.expression).and_then(|e| {
                e.parameters
                    .iter()
                    .find(|entry| entry.parameter_id == parameter.id)
            });
            let channel = |blend: ExpressionBlend, otherwise: f64| {
                entry
                    .filter(|e| e.blend == blend)
                    .map_or(otherwise, |e| e.value)
            };
            let own = Channels {
                additive: channel(ExpressionBlend::Add, 0.0),
                multiply: channel(ExpressionBlend::Multiply, 1.0),
                overwrite: channel(ExpressionBlend::Overwrite, base),
            };
            let w = layer.weight;
            result = if index == 0 {
                own
            } else {
                Channels {
                    additive: result.additive * (1.0 - w) + own.additive * w,
                    multiply: result.multiply * (1.0 - w) + own.multiply * w,
                    overwrite: base * (1.0 - w) + own.overwrite * w,
                }
            };
        }
        *value =
            base * (1.0 - weight) + (result.overwrite + result.additive) * result.multiply * weight;
    }
}

#[cfg(test)]
mod tests {
    use poffo_format::document::ExpressionParameter;

    use super::*;

    fn expression(
        id: &str,
        fade_in: Option<f64>,
        fade_out: Option<f64>,
        parameters: Vec<ExpressionParameter>,
    ) -> Expression {
        Expression {
            composition: None,
            fade_in_time: fade_in,
            fade_out_time: fade_out,
            id: id.into(),
            parameters,
        }
    }

    #[test]
    fn blends_and_cross_fades_like_typescript() {
        let p = |id: &str, blend, value| ExpressionParameter {
            blend,
            parameter_id: id.into(),
            value,
        };
        let expressions = [
            expression(
                "smile",
                Some(1.0),
                Some(0.5),
                vec![
                    p("mouth", ExpressionBlend::Add, 2.0),
                    p("eye", ExpressionBlend::Multiply, 0.5),
                    p("brow", ExpressionBlend::Overwrite, 4.0),
                ],
            ),
            expression("wink", Some(0.0), None, vec![]),
        ];
        let parameter = |id: &str| Parameter {
            default_value: 0.0,
            id: id.into(),
            maximum: 10.0,
            minimum: -10.0,
            name: id.into(),
            options: None,
            repeat: None,
            group_id: None,
        };
        let parameters = [parameter("mouth"), parameter("eye"), parameter("brow")];
        let mut values = [1.0, 4.0, 2.0];
        apply_layers(
            &parameters,
            &expressions,
            &[ExpressionLayer {
                stack: false,
                expression: 0,
                weight: 0.5,
                fade_in_weight: None,
            }],
            &mut values,
        );
        assert_eq!(values, [2.0, 3.0, 3.0]);

        let mut playback = ExpressionPlayback::default();
        playback.set(Some(0), &expressions);
        playback.advance(0.5, &expressions);
        assert_eq!(
            playback.layers(),
            [ExpressionLayer {
                stack: false,
                expression: 0,
                weight: 0.5,
                fade_in_weight: None,
            }]
        );
        playback.advance(1.0, &expressions);
        assert!(!playback.is_animating());
        playback.set(Some(1), &expressions);
        playback.advance(0.25, &expressions);
        assert_eq!(
            playback.layers(),
            [
                ExpressionLayer {
                    stack: false,
                    expression: 0,
                    weight: 0.5,
                    fade_in_weight: None,
                },
                ExpressionLayer {
                    stack: false,
                    expression: 1,
                    weight: 1.0,
                    fade_in_weight: None,
                }
            ]
        );
        playback.advance(0.25, &expressions);
        assert_eq!(playback.current(), Some(1));
        assert_eq!(playback.layers().len(), 1);
        playback.set(None, &expressions);
        playback.advance(1.0, &expressions);
        assert!(playback.layers().is_empty());
    }

    #[test]
    fn zero_fades_apply_without_another_frame() {
        let expressions = [expression("smile", Some(0.0), Some(0.0), vec![])];
        let mut playback = ExpressionPlayback::default();
        playback.set(Some(0), &expressions);
        let full = ExpressionLayer {
            stack: false,
            expression: 0,
            weight: 1.0,
            fade_in_weight: None,
        };
        assert_eq!(playback.layers(), [full]);
        assert!(!playback.is_animating());
        playback.set(None, &expressions);
        assert!(playback.layers().is_empty());
        assert!(!playback.is_animating());
    }

    fn parameter(id: &str, default_value: f64) -> Parameter {
        Parameter {
            default_value,
            id: id.into(),
            maximum: 10.0,
            minimum: -10.0,
            name: id.into(),
            options: None,
            repeat: None,
            group_id: None,
        }
    }

    fn cubism(
        id: &str,
        fade_in: Option<f64>,
        fade_out: Option<f64>,
        parameters: Vec<ExpressionParameter>,
    ) -> Expression {
        Expression {
            composition: Some(ExpressionComposition::Cubism),
            ..expression(id, fade_in, fade_out, parameters)
        }
    }

    fn entry(id: &str, blend: ExpressionBlend, value: f64) -> ExpressionParameter {
        ExpressionParameter {
            blend,
            parameter_id: id.into(),
            value,
        }
    }

    #[test]
    fn cubism_layers_apply_channels_at_the_overall_weight() {
        // `apply-cubism-expression-layers.spec.ts`.
        let parameters: Vec<Parameter> = ["add", "multiply", "overwrite", "other"]
            .iter()
            .map(|id| parameter(id, 2.0))
            .collect();
        let first = cubism(
            "first",
            None,
            None,
            vec![
                entry("add", ExpressionBlend::Add, 4.0),
                entry("multiply", ExpressionBlend::Multiply, 3.0),
                entry("overwrite", ExpressionBlend::Overwrite, 8.0),
            ],
        );
        let empty = cubism("next", None, None, vec![]);
        let next = cubism(
            "next",
            None,
            None,
            vec![
                entry("add", ExpressionBlend::Overwrite, 6.0),
                entry("multiply", ExpressionBlend::Multiply, 0.5),
                entry("overwrite", ExpressionBlend::Overwrite, 6.0),
            ],
        );
        let layer = |expression, weight, fade_in| ExpressionLayer {
            stack: false,
            expression,
            weight,
            fade_in_weight: Some(fade_in),
        };
        let apply = |expressions: &[Expression], layers: &[ExpressionLayer]| {
            let mut values = [2.0; 4];
            apply_layers(&parameters, expressions, layers, &mut values);
            values
        };
        let single = [first.clone()];
        assert_eq!(
            apply(&single, &[layer(0, 0.25, 0.25)]),
            [3.0, 3.0, 3.5, 2.0]
        );
        let outgoing = [first.clone(), empty];
        assert_eq!(
            apply(&outgoing, &[layer(0, 0.5, 1.0), layer(1, 0.5, 0.5)]),
            [4.0, 4.0, 2.0, 2.0]
        );
        let switch = [first, next];
        assert_eq!(
            apply(&switch, &[layer(0, 0.75, 1.0), layer(1, 0.25, 0.25)]),
            [6.0, 4.75, 3.0, 2.0]
        );
    }

    fn eye(playback: &ExpressionPlayback, expressions: &[Expression]) -> f64 {
        let mut values = [1.0];
        apply_layers(
            &[parameter("eye", 1.0)],
            expressions,
            &playback.layers(),
            &mut values,
        );
        values[0]
    }

    #[test]
    fn cubism_fades_use_sine_easing() {
        let expressions = [cubism("smile", Some(1.0), Some(0.5), vec![])];
        let mut playback = ExpressionPlayback::default();
        playback.set(Some(0), &expressions);
        playback.advance(1.0 / 3.0, &expressions);
        assert!((playback.layers()[0].weight - 0.25).abs() < 1e-9);
    }

    #[test]
    fn interrupted_cubism_fades_keep_the_blend() {
        let add = vec![entry("eye", ExpressionBlend::Add, -1.0)];
        let expressions = [
            cubism("first", Some(0.5), Some(0.5), add.clone()),
            cubism("next", Some(0.5), Some(0.5), add),
        ];
        let mut playback = ExpressionPlayback::default();
        playback.set(Some(0), &expressions);
        playback.advance(0.2, &expressions);
        playback.set(Some(1), &expressions);
        playback.advance(0.15, &expressions);
        assert!(eye(&playback, &expressions).abs() < 1e-9);
        playback.advance(0.35, &expressions);
        assert_eq!(playback.layers().len(), 1);
        assert!(eye(&playback, &expressions).abs() < 1e-9);
        playback.set(None, &expressions);
        playback.advance(0.25, &expressions);
        assert!((eye(&playback, &expressions) - 0.5).abs() < 1e-9);
        playback.advance(0.25, &expressions);
        assert!(playback.layers().is_empty());
    }

    #[test]
    fn cubism_releases_from_the_current_weight_and_reselects_in_place() {
        let expressions = [cubism(
            "smile",
            Some(1.0),
            Some(0.5),
            vec![entry("eye", ExpressionBlend::Add, 2.0)],
        )];
        let mut playback = ExpressionPlayback::default();
        playback.set(Some(0), &expressions);
        playback.advance(0.2, &expressions);
        let before = playback.layers()[0].weight;
        playback.set(None, &expressions);
        playback.advance(0.05, &expressions);
        assert!(playback.layers()[0].weight < before);
        let released = eye(&playback, &expressions);
        playback.set(Some(0), &expressions);
        assert!((eye(&playback, &expressions) - released).abs() < 1e-9);
    }

    #[test]
    fn zero_duration_cubism_expressions_replace_and_clear_at_once() {
        let expressions = [
            cubism("first", Some(0.0), Some(0.0), vec![]),
            cubism("next", Some(0.0), Some(0.0), vec![]),
        ];
        let mut playback = ExpressionPlayback::default();
        playback.set(Some(0), &expressions);
        playback.set(Some(1), &expressions);
        let ids: Vec<usize> = playback.layers().iter().map(|l| l.expression).collect();
        assert_eq!(ids, [1]);
        assert!(!playback.is_animating());
        playback.set(None, &expressions);
        assert!(playback.layers().is_empty());
    }
}
