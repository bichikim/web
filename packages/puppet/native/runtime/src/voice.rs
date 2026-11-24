//! Vowel weights from audio for mouth shapes (`player/voice/analyze-vowels.ts`,
//! `player/voice/mouth-shapes.ts`): linear prediction gives the spectral envelope, its first two
//! resonances (formants F1 and F2) are compared with each vowel's. An independent textbook
//! method, in the role of Cubism's MotionSync.

mod formants;
mod roots;
pub use formants::estimate_formants;
use poffo_format::document::{Document, MouthShapes};
use std::sync::LazyLock;

/// Weights in `a`, `i`, `u`, `e`, `o` order.
pub type VowelWeights = [f64; 5];

#[derive(serde::Deserialize)]
struct VowelReferences {
    a: Vec<[f64; 2]>,
    i: Vec<[f64; 2]>,
    u: Vec<[f64; 2]>,
    e: Vec<[f64; 2]>,
    o: Vec<[f64; 2]>,
}
// Compile the same reference data as JS so language-specific tuning cannot drift between engines.
static VOWEL_FORMANTS: LazyLock<VowelReferences> = LazyLock::new(|| {
    serde_json::from_str(include_str!(
        "../../../src/player/voice/vowel-formants.json"
    ))
    .expect("valid compiled vowel references")
});
const VOWEL_SPREAD: f64 = 0.25;
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

/// Soft vowel weights from the formants' log distance to each vowel's, summing to 1.
fn weigh_vowels([first, second]: [f64; 2]) -> VowelWeights {
    let references = &*VOWEL_FORMANTS;
    let scores = [
        &references.a,
        &references.i,
        &references.u,
        &references.e,
        &references.o,
    ]
    .map(|references| {
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
