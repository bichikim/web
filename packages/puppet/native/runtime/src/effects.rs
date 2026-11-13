//! Automatic model effects (`player/model-effects.ts`): eye blink, lip sync, seeded random
//! numbers and motion groups.

use poffo_format::document::Document;

/// Park–Miller minimal standard generator; the TypeScript player repeats it exactly.
const MODULUS: u64 = 2_147_483_647;
const MULTIPLIER: u64 = 48_271;

/// Seeded uniform numbers in 0..1 (`createSeededRandom`).
#[derive(Debug, Clone, Copy, PartialEq, Eq, serde::Serialize, serde::Deserialize)]
pub struct SeededRandom {
    state: u64,
}

impl SeededRandom {
    /// Seeds map onto states 1..MODULUS-1, seed 1 being state 1.
    pub fn new(seed: i64) -> Self {
        // In i128 so `seed - 1` cannot overflow at `i64::MIN`; the result is in 1..MODULUS.
        let span = i128::from(MODULUS - 1);
        let state = (i128::from(seed) - 1).rem_euclid(span) + 1;
        Self {
            state: u64::try_from(state).unwrap_or(1),
        }
    }

    pub fn next_f64(&mut self) -> f64 {
        self.state = self.state * MULTIPLIER % MODULUS;
        (self.state - 1) as f64 / (MODULUS - 1) as f64
    }
}

/// Seconds of each blink phase and the mean time between blinks (`EyeBlinkTiming`; Cubism's
/// blinking interval and settings). Each gap between blinks is random up to twice `interval`.
#[derive(Debug, Clone, Copy, PartialEq, serde::Serialize, serde::Deserialize)]
pub struct EyeBlinkTiming {
    pub closed: f64,
    pub closing: f64,
    pub interval: f64,
    pub opening: f64,
}

impl EyeBlinkTiming {
    /// `resolveEyeBlinkTiming`'s condition: every value positive and finite.
    pub fn is_valid(&self) -> bool {
        [self.closed, self.closing, self.interval, self.opening]
            .iter()
            .all(|value| value.is_finite() && *value > 0.0)
    }
}

impl Default for EyeBlinkTiming {
    fn default() -> Self {
        DEFAULT_EYE_BLINK_TIMING
    }
}

/// Cubism's defaults (`DEFAULT_EYE_BLINK_TIMING`).
pub const DEFAULT_EYE_BLINK_TIMING: EyeBlinkTiming = EyeBlinkTiming {
    closed: 0.05,
    closing: 0.1,
    interval: 4.0,
    opening: 0.15,
};

#[derive(Debug, Clone, Copy, PartialEq, serde::Serialize, serde::Deserialize)]
enum Phase {
    Open { next: f64 },
    Closing { since: f64 },
    Closed { since: f64 },
    Opening { since: f64 },
}

/// Where a blink is (`EyeBlinkState`).
#[derive(Debug, Clone, Copy, PartialEq, serde::Serialize, serde::Deserialize)]
pub(crate) struct EyeBlink {
    phase: Phase,
    time: f64,
}

/// The next blink, uniformly within twice the interval so blinks average `interval` apart.
fn schedule(time: f64, timing: EyeBlinkTiming, random: &mut SeededRandom) -> f64 {
    time + random.next_f64() * 2.0 * timing.interval
}

impl EyeBlink {
    pub(crate) fn new(timing: EyeBlinkTiming, random: &mut SeededRandom) -> Self {
        Self {
            phase: Phase::Open {
                next: schedule(0.0, timing, random),
            },
            time: 0.0,
        }
    }

    /// `advanceEyeBlink`: advances by `delta` and returns the eye openness (0..1).
    pub(crate) fn advance(
        &mut self,
        delta: f64,
        timing: EyeBlinkTiming,
        random: &mut SeededRandom,
    ) -> f64 {
        let time = self.time
            + if delta.is_finite() {
                delta.max(0.0)
            } else {
                0.0
            };
        self.time = time;
        let (phase, openness) = match self.phase {
            Phase::Open { next } if time > next => (Phase::Closing { since: time }, 1.0),
            Phase::Open { next } => (Phase::Open { next }, 1.0),
            Phase::Closing { since } => {
                let progress = (time - since) / timing.closing;
                if progress >= 1.0 {
                    (Phase::Closed { since: time }, 0.0)
                } else {
                    (Phase::Closing { since }, 1.0 - progress)
                }
            }
            Phase::Closed { since } => {
                if (time - since) / timing.closed >= 1.0 {
                    (Phase::Opening { since: time }, 0.0)
                } else {
                    (Phase::Closed { since }, 0.0)
                }
            }
            Phase::Opening { since } => {
                let progress = (time - since) / timing.opening;
                if progress >= 1.0 {
                    (
                        Phase::Open {
                            next: schedule(time, timing, random),
                        },
                        1.0,
                    )
                } else {
                    (Phase::Opening { since }, progress)
                }
            }
        };
        self.phase = phase;
        openness
    }
}

/// `applyLipSync`: adds `level` to every lip-sync parameter, within its range.
pub(crate) fn apply_lip_sync(
    document: &Document,
    parameter: impl Fn(&str) -> Option<usize>,
    values: &mut [f64],
    level: f64,
) {
    for id in &document.parameter_roles.lip_sync {
        let Some(index) = parameter(id) else {
            continue;
        };
        if let (Some(definition), Some(value)) =
            (document.parameters.get(index), values.get_mut(index))
        {
            *value = poffo_format::resolve_parameter_value(definition, Some(*value + level));
        }
    }
}

/// `applyBreath`: adds each breath parameter's `(offset + peak · sin(2π · time / period)) ·
/// weight`, within its range; `time` is seconds since breathing started.
pub(crate) fn apply_breath(
    document: &Document,
    parameter: impl Fn(&str) -> Option<usize>,
    values: &mut [f64],
    time: f64,
) {
    for breath in &document.breath {
        let Some(index) = parameter(&breath.parameter_id) else {
            continue;
        };
        if let (Some(definition), Some(value)) =
            (document.parameters.get(index), values.get_mut(index))
        {
            let wave = breath.offset
                + breath.peak * (2.0 * std::f64::consts::PI * time / breath.period).sin();
            *value = poffo_format::resolve_parameter_value(
                definition,
                Some(*value + wave * breath.weight),
            );
        }
    }
}

/// `pickGroupMotion`: a random motion index of `group`.
pub(crate) fn pick_group_motion(
    document: &Document,
    group: &str,
    random: &mut SeededRandom,
) -> Option<usize> {
    let motions: Vec<usize> = document
        .motions
        .iter()
        .enumerate()
        .filter(|(_, m)| m.group.as_deref() == Some(group))
        .map(|(i, _)| i)
        .collect();
    if motions.is_empty() {
        return None;
    }
    let pick = (random.next_f64() * motions.len() as f64).floor() as usize;
    motions.get(pick.min(motions.len() - 1)).copied()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn seeded_random_matches_the_minimal_standard_sequence() {
        let mut random = SeededRandom::new(1);
        assert!((random.next_f64() - 48_270.0 / 2_147_483_646.0).abs() < 1e-15);
        let mut a = SeededRandom::new(7);
        let mut b = SeededRandom::new(7);
        assert!((0..100).all(|_| a.next_f64() == b.next_f64()));
    }

    #[test]
    fn seeds_map_onto_states_without_overflow() {
        // `((seed - 1) mod (MODULUS - 1)) + 1`, computed exactly (values from Python's `%`).
        for (seed, state) in [
            (i64::MIN, 2_147_483_638),
            (i64::MAX, 7),
            (0, 2_147_483_646),
            (-1, 2_147_483_645),
            (1, 1),
            (7, 7),
            (2_147_483_646, 2_147_483_646),
            (2_147_483_647, 1),
        ] {
            assert_eq!(SeededRandom::new(seed), SeededRandom { state }, "{seed}");
        }
    }

    #[test]
    fn eye_blink_closes_rests_and_reopens() {
        let mut random = SeededRandom::new(1);
        let mut blink = EyeBlink {
            phase: Phase::Open { next: 4.0 },
            time: 0.0,
        };
        let openness: Vec<f64> = [4.01, 0.05, 0.06, 0.06, 0.075, 0.1]
            .iter()
            .map(|&d| {
                (blink.advance(d, DEFAULT_EYE_BLINK_TIMING, &mut random) * 100.0).round() / 100.0
            })
            .collect();
        assert_eq!(openness, vec![1.0, 0.5, 0.0, 0.0, 0.5, 1.0]);
        assert!(matches!(blink.phase, Phase::Open { .. }));
    }
}
