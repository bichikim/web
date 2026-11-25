//! Formant estimation shared with the current JS analyzer, including high-pitch refinement.
use super::{roots::polynomial_roots, weigh_vowels};
use std::f64::consts::PI;

const ANALYSIS_RATE: f64 = 8000.0;
const REFINEMENT_RATE: f64 = 12000.0;
const LOWEST_PITCH: f64 = 60.0;
const HIGHEST_PITCH: f64 = 400.0;
const ENVELOPE_MINIMUM: f64 = 150.0;
const ENVELOPE_MAXIMUM: f64 = 3500.0;
const F1_MAXIMUM: f64 = 1100.0;
const F2_SEPARATION: f64 = 200.0;

fn decimate(samples: &[f32], factor: usize) -> Vec<f64> {
    samples
        .chunks_exact(factor)
        .map(|group| group.iter().fold(0.0, |sum, &value| sum + f64::from(value)) / factor as f64)
        .collect()
}

fn windowed(samples: &[f64]) -> Vec<f64> {
    const PRE_EMPHASIS: f64 = 0.85;
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
            emphasized * (0.5 - 0.5 * (2.0 * PI * index as f64 / last).cos())
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

fn linear_prediction(correlation: &[f64], order: usize) -> Option<Vec<f64>> {
    let mut error = correlation[0];
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
        coefficients = (0..=step)
            .map(|lag| match lag {
                0 => 1.0,
                _ if lag == step => reflection,
                _ => coefficients[lag] + reflection * coefficients[step - lag],
            })
            .collect();
        error *= 1.0 - reflection * reflection;
        if error.is_nan() || error <= 0.0 {
            return None;
        }
    }
    Some(coefficients)
}

fn envelope_at(coefficients: &[f64], frequency: f64, rate: f64) -> f64 {
    let omega = 2.0 * PI * frequency / rate;
    let (mut real, mut imaginary) = (0.0, 0.0);
    for (lag, coefficient) in coefficients.iter().enumerate() {
        real += coefficient * (omega * lag as f64).cos();
        imaginary -= coefficient * (omega * lag as f64).sin();
    }
    -(real * real + imaginary * imaginary).ln()
}

fn find_formants(coefficients: &[f64], rate: f64) -> Option<[f64; 2]> {
    const ENVELOPE_STEP: f64 = 10.0;
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
    let first = peaks.iter().copied().find(|&value| value <= F1_MAXIMUM)?;
    let second = peaks
        .iter()
        .copied()
        .find(|&value| value >= first + F2_SEPARATION)?;
    Some([first, second])
}

fn resonant_formants(coefficients: &[f64], rate: f64) -> Option<[f64; 2]> {
    const MAXIMUM_BANDWIDTH: f64 = 400.0;
    let mut resonances = polynomial_roots(coefficients)?
        .into_iter()
        .filter(|[_, imaginary]| *imaginary > 0.0)
        .filter_map(|[real, imaginary]| {
            let bandwidth = -real.hypot(imaginary).ln() * rate / PI;
            let frequency = imaginary.atan2(real) * rate / (2.0 * PI);
            (bandwidth > 0.0
                && bandwidth < MAXIMUM_BANDWIDTH
                && (ENVELOPE_MINIMUM..=ENVELOPE_MAXIMUM).contains(&frequency))
            .then_some(frequency)
        })
        .collect::<Vec<_>>();
    resonances.sort_by(f64::total_cmp);
    let first = *resonances.first()?;
    let second = resonances
        .iter()
        .copied()
        .find(|&value| value >= first + F2_SEPARATION)?;
    (first <= F1_MAXIMUM).then_some([first, second])
}

fn is_voiced(samples: &[f64], rate: f64) -> bool {
    const VOICING: f64 = 0.3;
    let shortest = (rate / HIGHEST_PITCH).floor() as usize;
    let longest = samples
        .len()
        .saturating_sub(1)
        .min((rate / LOWEST_PITCH).ceil() as usize);
    let correlation = autocorrelation(samples, longest);
    let energy = correlation[0];
    correlation
        .iter()
        .enumerate()
        .any(|(lag, &value)| lag >= shortest && value > VOICING * energy)
}

fn resample(samples: &[f32], source_rate: f64, rate: f64) -> Vec<f64> {
    const RESAMPLE_CUTOFF: f64 = 0.45;
    const RESAMPLE_LOBES: f64 = 16.0;
    let ratio = source_rate / rate;
    let cutoff = RESAMPLE_CUTOFF / ratio;
    let radius = RESAMPLE_LOBES * ratio;
    (0..(samples.len() as f64 / ratio).floor() as usize)
        .map(|index| {
            let center = index as f64 * ratio;
            let start = (center - radius).ceil().max(0.0) as usize;
            let end = (center + radius).floor().min((samples.len() - 1) as f64) as usize;
            let (mut sum, mut total) = (0.0, 0.0);
            for (offset, &sample) in samples.iter().enumerate().take(end + 1).skip(start) {
                let distance = center - offset as f64;
                let argument = 2.0 * PI * cutoff * distance;
                let sinc = if argument == 0.0 {
                    1.0
                } else {
                    argument.sin() / argument
                };
                let weight = sinc * 0.5 * (1.0 + (PI * distance / radius).cos());
                sum += f64::from(sample) * weight;
                total += weight;
            }
            sum / total
        })
        .collect()
}

fn estimate_pitch(samples: &[f64], rate: f64) -> Option<f64> {
    const PITCH_CONFIDENCE: f64 = 0.5;
    const PITCH_PEAK_RATIO: f64 = 0.9;
    let shortest = (rate / HIGHEST_PITCH).floor() as usize;
    let longest = samples
        .len()
        .saturating_sub(1)
        .min((rate / LOWEST_PITCH).ceil() as usize);
    let correlations = (shortest..=longest)
        .map(|lag| {
            let (mut cross, mut left, mut right) = (0.0, 0.0, 0.0);
            for index in lag..samples.len() {
                cross += samples[index] * samples[index - lag];
                left += samples[index] * samples[index];
                right += samples[index - lag] * samples[index - lag];
            }
            if left > 0.0 && right > 0.0 {
                cross / (left * right).sqrt()
            } else {
                0.0
            }
        })
        .collect::<Vec<_>>();
    let threshold = PITCH_CONFIDENCE.max(
        correlations
            .iter()
            .copied()
            .fold(f64::NEG_INFINITY, f64::max)
            * PITCH_PEAK_RATIO,
    );
    correlations
        .iter()
        .enumerate()
        .find(|&(index, &value)| {
            index > 0
                && index < correlations.len() - 1
                && value >= correlations[index - 1]
                && value >= correlations[index + 1]
                && value > threshold
        })
        .map(|(index, _)| rate / (shortest + index) as f64)
}

fn fit_formants(frame: &[f64], rate: f64, order: usize) -> Option<[f64; 2]> {
    let coefficients = linear_prediction(&autocorrelation(frame, order), order)?;
    resonant_formants(&coefficients, rate).or_else(|| find_formants(&coefficients, rate))
}

fn refine_formants(samples: &[f32], sample_rate: f64) -> Option<[f64; 2]> {
    const REFINEMENT_ORDER: usize = 10;
    const REFINEMENT_EMPHASIS: f64 = 0.97;
    const GAUSSIAN_WIDTH: f64 = 6.0;
    let rate = sample_rate.min(REFINEMENT_RATE);
    let resampled = resample(samples, sample_rate, rate);
    if !is_voiced(&resampled, rate) {
        return None;
    }
    let frame = resampled
        .iter()
        .enumerate()
        .map(|(index, &value)| {
            let emphasized = if index == 0 {
                value
            } else {
                value - REFINEMENT_EMPHASIS * resampled[index - 1]
            };
            let position = (index as f64 - (resampled.len() as f64 - 1.0) / 2.0)
                / (resampled.len() as f64 / GAUSSIAN_WIDTH);
            emphasized * (-0.5 * position * position).exp()
        })
        .collect::<Vec<_>>();
    fit_formants(&frame, rate, REFINEMENT_ORDER)
}

/// F1/F2 of voiced audio; pitch-locked or uncertain estimates use a wider spectrum.
pub fn estimate_formants(samples: &[f32], sample_rate: f64) -> Option<[f64; 2]> {
    const LPC_ORDER: usize = 8;
    const REFINEMENT_PITCH: f64 = 180.0;
    const FUNDAMENTAL_RANGE: f64 = 1.5;
    const FORMANT_CONFIDENCE: f64 = 0.8;
    let factor = ((sample_rate / ANALYSIS_RATE).floor() as usize).max(1);
    let rate = sample_rate / factor as f64;
    let decimated = decimate(samples, factor);
    if !is_voiced(&decimated, rate) {
        return None;
    }
    let formants = fit_formants(&windowed(&decimated), rate, LPC_ORDER);
    if sample_rate <= rate {
        return formants;
    }
    let pitch = estimate_pitch(&decimated, rate);
    let near_pitch = formants
        .zip(pitch)
        .is_some_and(|(formants, pitch)| formants[0] < pitch * FUNDAMENTAL_RANGE);
    let uncertain = formants.is_none()
        || formants.zip(pitch).is_some_and(|(formants, pitch)| {
            pitch >= REFINEMENT_PITCH
                && formants[0] < HIGHEST_PITCH * FUNDAMENTAL_RANGE
                && weigh_vowels(formants)
                    .into_iter()
                    .fold(f64::NEG_INFINITY, f64::max)
                    < FORMANT_CONFIDENCE
        });
    if !near_pitch && !uncertain {
        return formants;
    }
    refine_formants(samples, sample_rate).or(if near_pitch { None } else { formants })
}
