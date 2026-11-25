//! Motion playbacks (`playback/create-motion-playbacks.ts`, `create-selected-playback.ts`).
//!
//! Shared playback types and stepping live here; [`independent`] holds the player's
//! independently started playbacks and [`selected`] its single selected motion.

mod independent;
pub(crate) use independent::PlaybackNotice;
mod selected;

pub(crate) use independent::Playbacks;
pub(crate) use selected::Selected;

use poffo_format::document::Motion;

use crate::motion::{MotionBlend, MotionFrame, passed_events};

/// A motion event that playback passed during [`crate::Player::update`].
#[derive(Debug, Clone, PartialEq)]
pub struct FiredMotionEvent {
    /// Motion index.
    pub motion: usize,
    pub time: f64,
    pub value: String,
}

/// Motion time after `step` seconds and the events passed.
fn step_motion(
    motion: &Motion,
    index: usize,
    time: f64,
    step: f64,
    looped: bool,
) -> (f64, Vec<FiredMotionEvent>) {
    let next = time + step;
    let wraps = looped && motion.duration > 0.0;
    let to = match (wraps, next.is_finite()) {
        (true, true) => next % motion.duration,
        // An overflowing step (`delta × speed`) has no phase; keep the current one.
        (true, false) => time,
        (false, _) => next.min(motion.duration),
    };
    // Counted from the wrapped time so both agree; saturates for huge or overflowing steps, and
    // `passed_events` caps the loops it reports anyway.
    let loops = if wraps {
        ((next - to) / motion.duration).round() as usize
    } else {
        0
    };
    let events = passed_events(motion, time, to, loops)
        .into_iter()
        .map(|event| FiredMotionEvent {
            motion: index,
            time: event.time,
            value: event.value.clone(),
        })
        .collect();
    (to, events)
}

/// Seconds a stopped or replaced motion keeps playing while it fades out.
fn fade_out_time(motion: &Motion) -> f64 {
    motion.fade_out_time.unwrap_or(0.0)
}

/// Time keeping shared by every playing motion: independent, selected and outgoing.
#[derive(Debug, Clone, Copy, PartialEq, serde::Serialize, serde::Deserialize)]
pub(crate) struct Cursor {
    pub(crate) looped: bool,
    pub(crate) speed: f64,
    pub(crate) time: f64,
    /// Motion seconds since it started fading in; `None` when it started settled.
    pub(crate) elapsed: Option<f64>,
}

/// What one [`Cursor::advance`] did.
struct Advanced {
    /// Motion seconds moved.
    step: f64,
    /// A one-shot reached its end.
    completed: bool,
    events: Vec<FiredMotionEvent>,
}

impl Cursor {
    pub(crate) fn new(looped: bool, speed: f64, elapsed: Option<f64>) -> Self {
        Self {
            looped,
            speed,
            time: 0.0,
            elapsed,
        }
    }

    /// Moves `motion` (at `index`) forward by `delta` real seconds at the cursor's speed.
    fn advance(&mut self, motion: &Motion, index: usize, delta: f64) -> Advanced {
        let step = delta.max(0.0) * self.speed;
        let completed = !self.looped && self.time + step >= motion.duration;
        let (time, events) = step_motion(motion, index, self.time, step, self.looped);
        self.time = time;
        self.elapsed = self.elapsed.map(|e| e + step);
        Advanced {
            step,
            completed,
            events,
        }
    }

    /// Seconds a fade-out counts down for an advance of `step`: motion time, or real time
    /// while frozen at speed 0 (the pose holds but the fade still ends).
    fn fade_step(&self, delta: f64, step: f64) -> f64 {
        if self.speed > 0.0 {
            step
        } else {
            delta.max(0.0)
        }
    }

    /// Motion seconds until a one-shot's end; `None` while looping.
    fn until_end(&self, duration: f64) -> Option<f64> {
        (!self.looped).then_some(duration - self.time)
    }

    /// Moves to a validated `time`, limited to `0..=length` for a known positive length. A
    /// finished one-shot sought before its end pauses so that it can resume.
    fn seek(&mut self, status: &mut PlaybackStatus, time: f64, length: Option<f64>) {
        let clamped = time.max(0.0);
        self.time = match length {
            Some(length) if length > 0.0 => clamped.min(length),
            _ => clamped,
        };
        if *status == PlaybackStatus::Finished && length.is_some_and(|l| self.time < l) {
            *status = PlaybackStatus::Paused;
        }
    }

    /// The mixer's view: replacing at priority 0 with weight 1 (independent playbacks set
    /// their own), moving at the cursor's speed while `advancing`.
    fn frame(&self, motion: usize, advancing: bool, remaining: Option<f64>) -> MotionFrame {
        MotionFrame {
            motion,
            blend: MotionBlend::Replace,
            priority: 0.0,
            time: self.time,
            weight: 1.0,
            rate: if advancing { self.speed } else { 0.0 },
            elapsed: self.elapsed,
            remaining,
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, serde::Serialize, serde::Deserialize)]
pub enum PlaybackStatus {
    Playing,
    Paused,
    Finished,
    Stopped,
}

/// Invalid playback numbers (the TypeScript player throws `RangeError`).
#[derive(Debug, Clone, Copy, PartialEq, thiserror::Error)]
#[error("{name} must be finite and at least {minimum}")]
pub struct PlaybackError {
    pub name: &'static str,
    pub minimum: f64,
}

fn validate(value: f64, name: &'static str, minimum: f64) -> Result<f64, PlaybackError> {
    if value.is_finite() && value >= minimum {
        Ok(value)
    } else {
        Err(PlaybackError { name, minimum })
    }
}

pub(crate) fn validate_speed(speed: f64) -> Result<f64, PlaybackError> {
    validate(speed, "Speed", 0.0)
}

pub(crate) fn validate_weight(weight: f64) -> Result<f64, PlaybackError> {
    validate(weight, "Weight", 0.0)
}

/// A finite seek time; negative times seek to the start.
pub(crate) fn validate_time(time: f64) -> Result<f64, PlaybackError> {
    validate(time, "Time", -f64::MAX)
}

#[derive(Debug, Clone, Copy, PartialEq)]
pub struct PlaybackOptions {
    pub blend: MotionBlend,
    /// `None` uses the motion's `loop` (looping when that is omitted too).
    pub looped: Option<bool>,
    /// Higher priorities are mixed later, over lower ones.
    pub priority: f64,
    pub speed: f64,
    pub weight: f64,
}

impl PlaybackOptions {
    /// The options with finite priority and non-negative finite speed and weight.
    fn validated(self) -> Result<Self, PlaybackError> {
        Ok(Self {
            priority: validate(self.priority, "Priority", -f64::MAX)?,
            speed: validate_speed(self.speed)?,
            weight: validate_weight(self.weight)?,
            ..self
        })
    }
}

impl Default for PlaybackOptions {
    fn default() -> Self {
        Self {
            blend: MotionBlend::Replace,
            looped: None,
            priority: 1.0,
            speed: 1.0,
            weight: 1.0,
        }
    }
}

/// Identifies one independent playback.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, serde::Serialize, serde::Deserialize)]
pub struct PlaybackHandle(pub u64);

#[derive(Debug, Clone, Copy, PartialEq)]
pub struct PlaybackState {
    pub motion: usize,
    pub duration: f64,
    pub speed: f64,
    pub status: PlaybackStatus,
    pub time: f64,
    pub weight: f64,
}

#[cfg(test)]
mod tests {
    use super::*;

    fn looping_marked_motion() -> Motion {
        serde_json::from_value(serde_json::json!({"duration": 1, "id": "loop",
            "events": [{"time": 0.25, "value": "mark"}], "tracks": []}))
        .expect("motion")
    }

    #[test]
    fn every_crossed_loop_reports_its_events() {
        let motions = [looping_marked_motion()];
        let mut playbacks = Playbacks::default();
        playbacks
            .start(0, PlaybackOptions::default(), None)
            .expect("start");
        assert_eq!(playbacks.advance(2.5, &motions).1.len(), 3);
        let mut selected = Selected::new(Some(0), true);
        assert_eq!(selected.advance(2.5, &motions).1.len(), 3);
    }

    #[test]
    fn one_update_reports_at_most_the_loop_cap() {
        let motions = [looping_marked_motion()];
        let mut playbacks = Playbacks::default();
        playbacks
            .start(0, PlaybackOptions::default(), None)
            .expect("start");
        // The first loop's tail, the capped full loops, then the last loop's head (empty).
        let events = playbacks.advance(1e9, &motions).1;
        assert_eq!(events.len(), crate::motion::MAX_EVENT_LOOPS + 1);
    }

    #[test]
    fn loop_counts_agree_with_the_wrapped_time() {
        let motion: Motion = serde_json::from_value(serde_json::json!({"duration": 0.7,
            "id": "loop", "events": [{"time": 0.35, "value": "mid"}], "tracks": []}))
        .expect("motion");
        // 30.099999999999998 / 0.7 rounds to 43 while the remainder is just under 0.7: 42 whole
        // loops then most of another, passing the event 43 times.
        let (time, events) = step_motion(&motion, 0, 0.0, 30.099999999999998, true);
        assert!(time > 0.69, "{time}");
        assert_eq!(events.len(), 43);
    }
}
