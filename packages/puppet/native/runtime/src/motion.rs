//! Keyframe sampling and motion mixing (`player/internal/motion.ts`, `mix-motion-frames.ts`).

use std::collections::HashMap;

use poffo_format::document::{
    Easing, Keyframe, ModelTrackTarget, Motion, MotionEvent, Parameter, Track, TrackAxis,
};
use poffo_format::resolve_parameter_value;

use crate::expression::{ExpressionLayer, apply_layers};
use crate::model::Model;

const BEZIER_ITERATIONS: usize = 40;

/// The cubic Bezier through `[start, first, second, end]` at parameter `t`.
fn cubic([start, first, second, end]: [f64; 4], t: f64) -> f64 {
    let rest = 1.0 - t;
    rest * rest * rest * start
        + 3.0 * rest * rest * t * first
        + 3.0 * rest * t * t * second
        + t * t * t * end
}

/// The value at `progress` on the cubic Bezier from `from` to `to` (`sampleBezier`): `t` is
/// found by 40 bisection steps on `x(t) = progress`, exactly as the TypeScript player does.
pub(crate) fn sample_bezier(from: f64, to: f64, progress: f64, handles: Option<[f64; 4]>) -> f64 {
    let [x1, y1, x2, y2] = handles.unwrap_or([1.0 / 3.0, from, 2.0 / 3.0, to]);
    let (mut low, mut high) = (0.0, 1.0);
    for _ in 0..BEZIER_ITERATIONS {
        let middle = (low + high) / 2.0;
        if cubic([0.0, x1, x2, 1.0], middle) < progress {
            low = middle;
        } else {
            high = middle;
        }
    }
    cubic([from, y1, y2, to], (low + high) / 2.0)
}

/// Eased progress of a segment from 0 to 1 (`easeProgress`).
pub(crate) fn ease(easing: Option<Easing>, p: f64) -> f64 {
    match easing.unwrap_or(Easing::Linear) {
        Easing::Bezier => sample_bezier(0.0, 1.0, p, None),
        Easing::Stepped => {
            if p < 1.0 {
                0.0
            } else {
                1.0
            }
        }
        Easing::InverseStepped => {
            if p > 0.0 {
                1.0
            } else {
                0.0
            }
        }
        Easing::Linear => p,
        Easing::EaseIn => p.powi(3),
        Easing::EaseOut => 1.0 - (1.0 - p).powi(3),
        Easing::EaseInOut => {
            if p < 0.5 {
                4.0 * p.powi(3)
            } else {
                1.0 - (-2.0 * p + 2.0).powi(3) / 2.0
            }
        }
    }
}

/// Interpolated value at `time`, eased by the earlier keyframe (`sampleKeyframes`).
pub fn sample_keyframes(keyframes: &[Keyframe], time: f64) -> f64 {
    match keyframes.iter().position(|k| k.time >= time) {
        None => keyframes.last().map_or(0.0, |k| k.value),
        Some(0) => keyframes[0].value,
        Some(next) => {
            let (previous, next) = (keyframes[next - 1], keyframes[next]);
            let duration = next.time - previous.time;
            let progress = if duration == 0.0 {
                0.0
            } else {
                (time - previous.time) / duration
            };
            if previous.easing == Some(Easing::Bezier) && progress < 1.0 {
                return sample_bezier(previous.value, next.value, progress, previous.bezier);
            }
            previous.value + (next.value - previous.value) * ease(previous.easing, progress)
        }
    }
}

/// Held value at `time` for option parameters (`sampleDiscreteKeyframes`).
pub fn sample_discrete_keyframes(keyframes: &[Keyframe], time: f64) -> f64 {
    match keyframes.iter().position(|k| k.time > time) {
        None => keyframes.last().map_or(0.0, |k| k.value),
        Some(next) => keyframes[next.saturating_sub(1)].value,
    }
}

/// How a playback combines with lower layers.
#[derive(Debug, Clone, Copy, PartialEq, Eq, serde::Serialize, serde::Deserialize)]
pub enum MotionBlend {
    /// Weighted average with same-priority playbacks over the layers below.
    Replace,
    /// Adds the change from the parameter default or rest vertex.
    Add,
}

/// One playback's contribution this frame.
#[derive(Debug, Clone, Copy, serde::Serialize, serde::Deserialize)]
pub(crate) struct MotionFrame {
    pub(crate) motion: usize,
    pub(crate) blend: MotionBlend,
    pub(crate) priority: f64,
    pub(crate) time: f64,
    pub(crate) weight: f64,
    /// Motion seconds per second while it advances; 0 while paused or finished.
    pub(crate) rate: f64,
    /// Motion seconds since the playback started; `None` when it started without fading in.
    pub(crate) elapsed: Option<f64>,
    /// Motion seconds until the playback ends; `None` while it is not ending.
    pub(crate) remaining: Option<f64>,
}

/// Cubism's `GetEasingSine`: `0.5 − 0.5 cos(πt)` for `t` limited to 0..1 (`easeSine`).
pub(crate) fn ease_sine(progress: f64) -> f64 {
    0.5 - 0.5 * (std::f64::consts::PI * progress.clamp(0.0, 1.0)).cos()
}

fn fade_factor(seconds: Option<f64>, duration: f64) -> f64 {
    match seconds {
        Some(seconds) if duration > 0.0 => ease_sine(seconds / duration),
        _ => 1.0,
    }
}

/// `getTrackFadeWeight`: the track's (or else the motion's) fade in since the start and fade
/// out before the end.
pub(crate) fn track_fade_weight(frame: &MotionFrame, motion: &Motion, track: &Track) -> f64 {
    let (fade_in, fade_out) = track.fade();
    fade_factor(
        frame.elapsed,
        fade_in.or(motion.fade_in_time).unwrap_or(0.0),
    ) * fade_factor(
        frame.remaining,
        fade_out.or(motion.fade_out_time).unwrap_or(0.0),
    )
}

/// Loops whose events one update reports in full; beyond this, a single huge step (a stalled
/// frame at a very high speed) would build an unbounded event list (web `MAX_EVENT_LOOPS`).
pub(crate) const MAX_EVENT_LOOPS: usize = 1024;

/// Events passed, in order, when motion time moves from `from` to `to` (`from < time <= to`)
/// across `wraps` loop boundaries: `from..duration`, every full loop in between, then `0..to`
/// (`getPassedEvents`).
pub(crate) fn passed_events(
    motion: &Motion,
    from: f64,
    to: f64,
    wraps: usize,
) -> Vec<&MotionEvent> {
    if motion.events.is_empty() {
        return Vec::new();
    }
    let mut events: Vec<&MotionEvent> = motion.events.iter().collect();
    events.sort_by(|a, b| a.time.total_cmp(&b.time));
    let within = |start: f64, end: f64| {
        events
            .iter()
            .copied()
            .filter(move |e| e.time > start && e.time <= end)
    };
    if wraps == 0 {
        return within(from, to).collect();
    }
    let full_loops = (wraps - 1).min(MAX_EVENT_LOOPS);
    within(from, motion.duration)
        .chain((0..full_loops).flat_map(|_| within(0.0, motion.duration)))
        .chain(within(0.0, to))
        .collect()
}

#[derive(Debug, Clone, Copy)]
pub(crate) struct MotionSample {
    blend: MotionBlend,
    priority: f64,
    value: f64,
    weight: f64,
}

fn mix_replacements(samples: &[&MotionSample], current: f64) -> f64 {
    let maximum = samples.iter().fold(0.0_f64, |m, s| m.max(s.weight));
    if maximum == 0.0 {
        return current;
    }
    let scaled: f64 = samples.iter().map(|s| s.weight / maximum).sum();
    let contribution = f64::min(1.0, maximum * scaled);
    current * (1.0 - contribution)
        + samples
            .iter()
            .map(|s| s.value * (s.weight / maximum / scaled) * contribution)
            .sum::<f64>()
}

/// Layers samples by ascending priority (`mixSamples`).
pub(crate) fn mix_samples(samples: &[MotionSample], initial: f64, reference: f64) -> f64 {
    let mut priorities: Vec<f64> = samples.iter().map(|s| s.priority).collect();
    priorities.sort_by(f64::total_cmp);
    priorities.dedup();
    priorities.into_iter().fold(initial, |current, priority| {
        let layer: Vec<&MotionSample> = samples.iter().filter(|s| s.priority == priority).collect();
        let replacements: Vec<&MotionSample> = layer
            .iter()
            .copied()
            .filter(|s| s.blend == MotionBlend::Replace)
            .collect();
        let blended = mix_replacements(&replacements, current);
        layer
            .iter()
            .filter(|s| s.blend == MotionBlend::Add)
            .fold(blended, |total, s| total + (s.value - reference) * s.weight)
    })
}

/// Mixed parameter values plus per-coordinate vertex and per-group opacity samples.
#[derive(Debug, Default)]
pub(crate) struct MotionMix {
    pub(crate) parameter_values: Vec<f64>,
    pub(crate) motion_parameter_values: Vec<f64>,
    /// Part index → coordinate index → samples.
    pub(crate) vertex_samples: HashMap<usize, HashMap<usize, Vec<MotionSample>>>,
    /// Scene group ID → opacity samples, mixed by [`MotionMix::group_opacity`].
    pub(crate) group_opacity_samples: HashMap<String, Vec<MotionSample>>,
    /// Model opacity after motions, 0..1.
    pub(crate) model_opacity: f64,
}

impl MotionMix {
    /// `mixGroupOpacity`: the group's opacity with group-opacity tracks mixed over `opacity`.
    pub(crate) fn group_opacity(&self, group_id: &str, opacity: f64) -> f64 {
        self.group_opacity_samples
            .get(group_id)
            .map_or(opacity, |samples| mix_samples(samples, opacity, opacity))
            .clamp(0.0, 1.0)
    }
}

/// Automatic effects applied while mixing.
#[derive(Debug, Clone, Copy)]
pub(crate) struct MixEffects {
    /// Automatic eye blink's openness for the eye-blink parameters.
    pub(crate) eye_openness: Option<f64>,
    /// Model opacity before motions.
    pub(crate) model_opacity: f64,
}

/// The range end farther from the default: where eye openness 0 puts an eye-blink parameter.
fn closed_value(parameter: &Parameter) -> f64 {
    if (parameter.maximum - parameter.default_value).abs()
        > (parameter.minimum - parameter.default_value).abs()
    {
        parameter.maximum
    } else {
        parameter.minimum
    }
}

/// An eye-blink parameter's value at `openness`, scaling its offset from the closed value.
fn open_to(parameter: &Parameter, value: f64, openness: f64) -> f64 {
    let closed = closed_value(parameter);
    closed + (value - closed) * openness
}

/// A frame's model curve for `target`: its value and fade-weighted frame weight.
fn model_curve(
    frame: &MotionFrame,
    motion: &Motion,
    target: ModelTrackTarget,
) -> Option<(f64, f64)> {
    motion.tracks.iter().find_map(|track| match track {
        Track::Model {
            target: t,
            keyframes,
            ..
        } if *t == target && !keyframes.is_empty() => Some((
            sample_keyframes(keyframes, frame.time),
            frame.weight * track_fade_weight(frame, motion, track),
        )),
        _ => None,
    })
}

/// Samples gathered from every frame.
#[derive(Default)]
struct Samples {
    parameters: Vec<Vec<MotionSample>>,
    vertices: HashMap<usize, HashMap<usize, Vec<MotionSample>>>,
    groups: HashMap<String, Vec<MotionSample>>,
    model_opacity: Vec<MotionSample>,
}

/// Role parameter indices.
struct Roles {
    eye_blink: Vec<usize>,
    lip_sync: Vec<usize>,
}

impl Model {
    fn roles(&self) -> Roles {
        let indices = |ids: &[String]| {
            ids.iter()
                .filter_map(|id| self.parameter_index(id))
                .collect()
        };
        Roles {
            eye_blink: indices(&self.document.parameter_roles.eye_blink),
            lip_sync: indices(&self.document.parameter_roles.lip_sync),
        }
    }

    /// One frame's samples (`mixFrame`). Eye-blink and lip-sync curves scale or offset the
    /// frame's own curves on role parameters and set role parameters it has none for.
    fn mix_frame(&self, frame: &MotionFrame, roles: &Roles, samples: &mut Samples) {
        let parameters = &self.document.parameters;
        let motion = &self.document.motions[frame.motion];
        let eye = model_curve(frame, motion, ModelTrackTarget::EyeBlink);
        let lip = model_curve(frame, motion, ModelTrackTarget::LipSync);
        let mut keyed = vec![false; parameters.len()];
        for track in motion.tracks.iter().filter(|t| !t.keyframes().is_empty()) {
            let weight = frame.weight * track_fade_weight(frame, motion, track);
            let sample = |value| MotionSample {
                blend: frame.blend,
                priority: frame.priority,
                value,
                weight,
            };
            match track {
                Track::Parameter {
                    parameter_id,
                    keyframes,
                    ..
                } => {
                    let Some(p) = self.parameter_index(parameter_id) else {
                        continue;
                    };
                    let mut value = if parameters[p].options.is_some() {
                        sample_discrete_keyframes(keyframes, frame.time)
                    } else {
                        sample_keyframes(keyframes, frame.time)
                    };
                    if let Some((openness, _)) = eye.filter(|_| roles.eye_blink.contains(&p)) {
                        value = open_to(&parameters[p], value, openness);
                    }
                    if let Some((level, _)) = lip.filter(|_| roles.lip_sync.contains(&p)) {
                        value += level;
                    }
                    if motion.parameter_bounds.as_deref() == Some("sample") {
                        let parameter = &parameters[p];
                        let min = parameter.minimum;
                        let max = parameter.maximum;
                        let span = max - min;
                        value = if parameter.repeat == Some(true) {
                            if span == 0.0 {
                                min
                            } else if value < min {
                                max - ((min - value) % span)
                            } else if value > max {
                                min + ((value - max) % span)
                            } else {
                                value
                            }
                        } else {
                            value.clamp(min, max)
                        };
                    }
                    keyed[p] = true;
                    samples.parameters[p].push(sample(value));
                }
                Track::Vertex {
                    axis,
                    keyframes,
                    part_id,
                    vertex_index,
                    ..
                } => {
                    let Some(part) = self.part_index(part_id) else {
                        continue;
                    };
                    let coordinate = vertex_index * 2 + usize::from(*axis == TrackAxis::Y);
                    samples
                        .vertices
                        .entry(part)
                        .or_default()
                        .entry(coordinate)
                        .or_default()
                        .push(sample(sample_keyframes(keyframes, frame.time)));
                }
                Track::GroupOpacity {
                    group_id,
                    keyframes,
                    ..
                } => samples
                    .groups
                    .entry(group_id.clone())
                    .or_default()
                    .push(sample(sample_keyframes(keyframes, frame.time))),
                Track::Model {
                    target: ModelTrackTarget::Opacity,
                    keyframes,
                    ..
                } => samples
                    .model_opacity
                    .push(sample(sample_keyframes(keyframes, frame.time))),
                Track::Model { .. } => {}
            }
        }
        let set = |ids: &[usize],
                   curve: Option<(f64, f64)>,
                   value: &dyn Fn(&Parameter, f64) -> f64,
                   samples: &mut Samples| {
            let Some((curve_value, weight)) = curve else {
                return;
            };
            for &p in ids.iter().filter(|&&p| !keyed[p]) {
                samples.parameters[p].push(MotionSample {
                    blend: MotionBlend::Replace,
                    priority: frame.priority,
                    value: value(&parameters[p], curve_value),
                    weight,
                });
            }
        };
        set(
            &roles.eye_blink,
            eye,
            &|parameter, openness| open_to(parameter, parameter.default_value, openness),
            samples,
        );
        set(&roles.lip_sync, lip, &|_, level| level, samples);
    }

    /// Mixes motions, then expression layers, then external overrides (`mixMotionFrames`).
    pub(crate) fn mix_frames(
        &self,
        frames: &[MotionFrame],
        expressions: &[ExpressionLayer],
        overrides: &[Option<f64>],
        effects: MixEffects,
        base_values: Option<&[f64]>,
        groups: &[Vec<ExpressionLayer>],
    ) -> MotionMix {
        let parameters = &self.document.parameters;
        let roles = self.roles();
        let mut samples = Samples {
            parameters: vec![Vec::new(); parameters.len()],
            ..Samples::default()
        };
        for frame in frames.iter().filter(|f| f.weight > 0.0) {
            self.mix_frame(frame, &roles, &mut samples);
        }
        let mut sampled: Vec<f64> = parameters
            .iter()
            .enumerate()
            .map(|(i, parameter)| {
                let value = mix_samples(
                    &samples.parameters[i],
                    base_values
                        .and_then(|v| v.get(i))
                        .copied()
                        .unwrap_or(parameter.default_value),
                    parameter.default_value,
                );
                let value = match effects.eye_openness {
                    Some(openness) if roles.eye_blink.contains(&i) => {
                        open_to(parameter, parameter.default_value, openness)
                    }
                    _ => value,
                };
                let precision = self.document.motion_parameter_precision.unwrap_or(
                    if self.document.motion_parameter_base.is_some() {
                        poffo_format::document::NumberPrecision::Float32
                    } else {
                        poffo_format::document::NumberPrecision::Float64
                    },
                );
                if precision == poffo_format::document::NumberPrecision::Float32 {
                    f64::from(value as f32)
                } else {
                    value
                }
            })
            .collect();
        let motion_parameter_values = parameters
            .iter()
            .zip(&sampled)
            .map(|(parameter, &value)| resolve_parameter_value(parameter, Some(value)))
            .collect();
        apply_layers(
            parameters,
            &self.document.expressions,
            expressions,
            &mut sampled,
        );
        for layers in groups {
            apply_layers(parameters, &self.document.expressions, layers, &mut sampled);
        }
        let parameter_values = parameters
            .iter()
            .zip(sampled)
            .enumerate()
            .map(|(i, (parameter, sampled))| {
                let value = overrides.get(i).copied().flatten().unwrap_or(sampled);
                resolve_parameter_value(parameter, Some(value))
            })
            .collect();
        let base = effects.model_opacity;
        MotionMix {
            motion_parameter_values,
            parameter_values,
            vertex_samples: samples.vertices,
            group_opacity_samples: samples.groups,
            model_opacity: mix_samples(&samples.model_opacity, base, base).clamp(0.0, 1.0),
        }
    }
}

/// `mixMotionVertices` for one part, in place.
pub(crate) fn mix_vertices(mix: &MotionMix, part: usize, rest: &[f64], vertices: &mut [f32]) {
    let Some(coordinates) = mix.vertex_samples.get(&part) else {
        return;
    };
    for (index, value) in vertices.iter_mut().enumerate() {
        if let Some(samples) = coordinates.get(&index) {
            let current = f64::from(*value);
            *value = mix_samples(
                samples,
                current,
                rest.get(index).copied().unwrap_or(current),
            ) as f32;
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn key(time: f64, value: f64, easing: Option<Easing>) -> Keyframe {
        Keyframe {
            bezier: None,
            easing,
            time,
            value,
        }
    }

    #[test]
    fn keyframes_clamp_ease_and_hold() {
        let keys = [key(0.0, 0.0, Some(Easing::EaseIn)), key(1.0, 8.0, None)];
        assert_eq!(sample_keyframes(&keys, -1.0), 0.0);
        assert_eq!(sample_keyframes(&keys, 0.5), 1.0);
        assert_eq!(sample_keyframes(&keys, 2.0), 8.0);
        assert_eq!(sample_discrete_keyframes(&keys, 0.5), 0.0);
        assert_eq!(sample_discrete_keyframes(&keys, 1.0), 8.0);
    }

    #[test]
    fn replace_layers_average_and_add_layers_offset() {
        let s = |blend, priority, value, weight| MotionSample {
            blend,
            priority,
            value,
            weight,
        };
        let replace = [s(MotionBlend::Replace, 1.0, 10.0, 0.5)];
        assert_eq!(mix_samples(&replace, 0.0, 0.0), 5.0);
        let pair = [
            s(MotionBlend::Replace, 1.0, 10.0, 1.0),
            s(MotionBlend::Replace, 1.0, 20.0, 1.0),
        ];
        assert_eq!(mix_samples(&pair, 0.0, 0.0), 15.0);
        let layered = [
            s(MotionBlend::Replace, 1.0, 10.0, 1.0),
            s(MotionBlend::Add, 2.0, 3.0, 1.0),
        ];
        assert_eq!(mix_samples(&layered, 0.0, 1.0), 12.0);
    }
}
