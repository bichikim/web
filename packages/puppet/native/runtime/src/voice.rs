//! Vowel weights from audio for mouth shapes (`player/voice/analyze-vowels.ts`,
//! `player/voice/mouth-shapes.ts`): linear prediction gives the spectral envelope, its first two
//! resonances (formants F1 and F2) are compared with each vowel's. An independent textbook
//! method, in the role of Cubism's MotionSync.

use std::f64::consts::PI;

use poffo_format::document::{Document, MouthShapes};

/// Weights in `a`, `i`, `u`, `e`, `o` order.
pub type VowelWeights = [f64; 5];

/// Approximate F1 and F2 (Hz) per vowel, in `VowelWeights` order: an adult male and an adult
/// female Japanese voice, plus the rounded back u of Korean or English (`vowel-formants.json`).
const VOWEL_FORMANTS: [&[[f64; 2]]; 5] = [
    &[[750.0, 1250.0], [900.0, 1600.0]],
    &[[300.0, 2300.0], [350.0, 2800.0]],
    &[[350.0, 1350.0], [410.0, 1750.0], [330.0, 800.0]],
    &[[500.0, 1900.0], [550.0, 2350.0]],
    &[[500.0, 850.0], [570.0, 1050.0]],
];

const ANALYSIS_RATE: f64 = 8000.0;
const LPC_ORDER: usize = 10;
const PRE_EMPHASIS: f64 = 0.97;
const ENVELOPE_STEP: f64 = 10.0;
const ENVELOPE_MINIMUM: f64 = 150.0;
const ENVELOPE_MAXIMUM: f64 = 3500.0;
const F1_MAXIMUM: f64 = 1100.0;
const F2_SEPARATION: f64 = 200.0;
/// Width, in log frequency, of a vowel's region.
const VOWEL_SPREAD: f64 = 0.25;
const HAMMING_BASE: f64 = 0.54;
const HAMMING_SWING: f64 = 0.46;
const LOWEST_PITCH: f64 = 60.0;
const HIGHEST_PITCH: f64 = 400.0;
/// Normalized autocorrelation at the pitch period above which a frame is voiced.
const VOICING: f64 = 0.3;
/// Shown weights below this total, with no target, have faded out.
const FADED: f64 = 0.0001;

/// Loudness range mapped to voice activity.
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct AnalyzeVowelsOptions {
    /// dBFS at and below which a frame is silent.
    pub silence_decibels: f64,
    /// dBFS at and above which a frame is fully voiced.
    pub full_decibels: f64,
}

impl Default for AnalyzeVowelsOptions {
    fn default() -> Self {
        Self {
            silence_decibels: -50.0,
            full_decibels: -25.0,
        }
    }
}

/// One frame's voice activity (0..1) and vowel weights summing to it.
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct VowelAnalysis {
    pub level: f64,
    pub weights: VowelWeights,
}

/// Averages groups of `factor` samples: a crude low-pass and decimation to about 8 kHz.
fn decimate(samples: &[f32], factor: usize) -> Vec<f64> {
    samples
        .chunks_exact(factor)
        .map(|group| {
            let sum = group.iter().fold(0.0, |sum, &v| sum + f64::from(v));
            sum / factor as f64
        })
        .collect()
}

fn windowed(samples: &[f64]) -> Vec<f64> {
    let last = samples.len().saturating_sub(1).max(1) as f64;
    samples
        .iter()
        .enumerate()
        .map(|(index, &value)| {
            let emphasized = if index == 0 {
                value
            } else {
                value - PRE_EMPHASIS * samples[index - 1]
            };
            let phase = 2.0 * PI * index as f64 / last;
            emphasized * (HAMMING_BASE - HAMMING_SWING * phase.cos())
        })
        .collect()
}

fn autocorrelation(samples: &[f64], order: usize) -> Vec<f64> {
    (0..=order)
        .map(|lag| {
            (lag..samples.len()).fold(0.0, |sum, index| {
                sum + samples[index] * samples[index - lag]
            })
        })
        .collect()
}

/// Levinson–Durbin recursion: coefficients with `A(z) = 1 + Σ c_k z^-k`, `c_0 = 1`.
fn linear_prediction(correlation: &[f64], order: usize) -> Option<Vec<f64>> {
    let mut error = correlation[0];
    // NaN as well as non-positive energy ends the recursion.
    if error.is_nan() || error <= 0.0 {
        return None;
    }
    let mut coefficients = vec![1.0];
    for step in 1..=order {
        let mut sum = correlation[step];
        for lag in 1..step {
            sum += coefficients[lag] * correlation[step - lag];
        }
        let reflection = -sum / error;
        let next: Vec<f64> = (0..=step)
            .map(|lag| match lag {
                0 => 1.0,
                _ if lag == step => reflection,
                _ => coefficients[lag] + reflection * coefficients[step - lag],
            })
            .collect();
        coefficients = next;
        error *= 1.0 - reflection * reflection;
        if error.is_nan() || error <= 0.0 {
            return None;
        }
    }
    Some(coefficients)
}

/// Log power of `1 / A` at `frequency`.
fn envelope_at(coefficients: &[f64], frequency: f64, rate: f64) -> f64 {
    let omega = 2.0 * PI * frequency / rate;
    let (mut real, mut imaginary) = (0.0, 0.0);
    for (lag, coefficient) in coefficients.iter().enumerate() {
        real += coefficient * (omega * lag as f64).cos();
        imaginary -= coefficient * (omega * lag as f64).sin();
    }
    -(real * real + imaginary * imaginary).ln()
}

/// F1 and F2: the first envelope peak up to 1100 Hz and the next at least 200 Hz above it.
fn find_formants(coefficients: &[f64], rate: f64) -> Option<[f64; 2]> {
    let mut peaks = Vec::new();
    let mut previous = envelope_at(coefficients, ENVELOPE_MINIMUM - ENVELOPE_STEP, rate);
    let mut current = envelope_at(coefficients, ENVELOPE_MINIMUM, rate);
    let mut frequency = ENVELOPE_MINIMUM;
    while frequency <= ENVELOPE_MAXIMUM {
        let next = envelope_at(coefficients, frequency + ENVELOPE_STEP, rate);
        if current > previous && current >= next {
            peaks.push(frequency);
        }
        previous = current;
        current = next;
        frequency += ENVELOPE_STEP;
    }
    let first = peaks.iter().copied().find(|&f| f <= F1_MAXIMUM)?;
    let second = peaks
        .iter()
        .copied()
        .find(|&f| f >= first + F2_SEPARATION)?;
    Some([first, second])
}

/// Whether the frame is periodic, as voiced speech is: its normalized autocorrelation peaks
/// above 0.3 at some lag within the 60–400 Hz pitch range. Noise and unvoiced consonants are not.
fn is_voiced(samples: &[f64], rate: f64) -> bool {
    let shortest = (rate / HIGHEST_PITCH).floor() as usize;
    let longest = (samples.len().saturating_sub(1)).min((rate / LOWEST_PITCH).ceil() as usize);
    let correlation = autocorrelation(samples, longest);
    let energy = correlation[0];
    correlation
        .iter()
        .enumerate()
        .any(|(lag, &value)| lag >= shortest && value > VOICING * energy)
}

/// F1 and F2 (Hz) of a frame, or `None` when it is unvoiced or its envelope has no two
/// resonances.
pub fn estimate_formants(samples: &[f32], sample_rate: f64) -> Option<[f64; 2]> {
    let factor = ((sample_rate / ANALYSIS_RATE).floor() as usize).max(1);
    let rate = sample_rate / factor as f64;
    let decimated = decimate(samples, factor);
    if decimated.is_empty() || !is_voiced(&decimated, rate) {
        return None;
    }
    let frame = windowed(&decimated);
    let coefficients = linear_prediction(&autocorrelation(&frame, LPC_ORDER), LPC_ORDER)?;
    find_formants(&coefficients, rate)
}

/// Soft vowel weights from the formants' log distance to each vowel's, summing to 1.
fn weigh_vowels([first, second]: [f64; 2]) -> VowelWeights {
    let scores = VOWEL_FORMANTS.map(|references| {
        let distance = references
            .iter()
            .map(|[r1, r2]| (first / r1).ln().hypot((second / r2).ln()))
            .fold(f64::INFINITY, f64::min);
        (-(distance / VOWEL_SPREAD).powi(2)).exp()
    });
    let total: f64 = scores.iter().sum();
    scores.map(|score| if total > 0.0 { score / total } else { 0.0 })
}

/// `measureVoiceLevel`: loudness of a frame from 0 (silence) to 1 by its mean power in dBFS,
/// voiced or not (Cubism's volume lip sync).
pub fn measure_voice_level(samples: &[f32], options: AnalyzeVowelsOptions) -> f64 {
    let power = samples
        .iter()
        .fold(0.0, |sum, &v| sum + f64::from(v).powi(2));
    let decibels = 10.0 * (power / samples.len().max(1) as f64).log10();
    if decibels.is_finite() {
        ((decibels - options.silence_decibels) / (options.full_decibels - options.silence_decibels))
            .clamp(0.0, 1.0)
    } else {
        0.0
    }
}

/// `analyzeVowels`: vowel weights of one frame of mono samples (about 20–50 ms). An unvoiced frame
/// (noise, consonants such as s) or one without two resonances counts as silence.
pub fn analyze_vowels(
    samples: &[f32],
    sample_rate: f64,
    options: AnalyzeVowelsOptions,
) -> VowelAnalysis {
    let level = measure_voice_level(samples, options);
    let formants = (level > 0.0)
        .then(|| estimate_formants(samples, sample_rate))
        .flatten();
    match formants {
        Some(formants) => VowelAnalysis {
            level,
            weights: weigh_vowels(formants).map(|w| w * level),
        },
        None => VowelAnalysis {
            level: 0.0,
            weights: [0.0; 5],
        },
    }
}

/// `normalizeVowelWeights`: each weight within 0..1, scaled down together above a sum of 1.
pub fn normalize_vowel_weights(weights: VowelWeights) -> VowelWeights {
    let clamped = weights.map(|w| {
        if w.is_finite() {
            w.clamp(0.0, 1.0)
        } else {
            0.0
        }
    });
    let sum: f64 = clamped.iter().sum();
    if sum > 1.0 {
        clamped.map(|w| w / sum)
    } else {
        clamped
    }
}

/// Weights shown now and the ones they move toward; no target fades them out.
#[derive(Debug, Clone, Copy, PartialEq, serde::Serialize, serde::Deserialize)]
pub(crate) struct MouthShapesState {
    pub(crate) shown: VowelWeights,
    pub(crate) target: Option<VowelWeights>,
}

impl MouthShapesState {
    /// `advanceMouthShapes`: toward the target with time constant `smoothing` seconds; `None`
    /// once faded out with no target.
    pub(crate) fn advance(self, delta_time: f64, smoothing: f64) -> Option<Self> {
        let step = if smoothing > 0.0 {
            1.0 - (-delta_time.max(0.0) / smoothing).exp()
        } else {
            1.0
        };
        let target = self.target.unwrap_or([0.0; 5]);
        let shown = std::array::from_fn(|i| self.shown[i] + (target[i] - self.shown[i]) * step);
        (self.target.is_some() || shown.iter().sum::<f64>() >= FADED)
            .then_some(Self { shown, ..self })
    }
}

/// `applyMouthShapes`: `value · (1 − Σ w) + Σ w · shape` for each mouth-shape parameter, so
/// silence keeps the motion's mouth.
pub(crate) fn apply_mouth_shapes(
    document: &Document,
    shapes: &MouthShapes,
    parameter: impl Fn(&str) -> Option<usize>,
    values: &mut [f64],
    weights: VowelWeights,
) {
    let sum: f64 = weights.iter().sum();
    let vowels = shapes.vowels.all();
    for (index, id) in shapes.parameter_ids.iter().enumerate() {
        let Some(slot) = parameter(id) else {
            continue;
        };
        if let (Some(definition), Some(value)) =
            (document.parameters.get(slot), values.get_mut(slot))
        {
            let current = poffo_format::resolve_parameter_value(definition, Some(*value));
            let shaped = vowels.iter().zip(weights).fold(
                current * (1.0 - sum),
                |shaped, (shape, weight)| {
                    shaped + weight * shape.get(index).copied().unwrap_or(current)
                },
            );
            *value = poffo_format::resolve_parameter_value(definition, Some(shaped));
        }
    }
}
