//! The player's selected motion and the motions fading out after a switch
//! (`playback/create-selected-playback.ts`).

use poffo_format::document::Motion;

use super::{
    Cursor, FiredMotionEvent, PlaybackError, PlaybackStatus, fade_out_time, validate_time,
};
use crate::motion::MotionFrame;

/// A previously selected motion, playing on while it fades out after a switch.
#[derive(Debug, Clone, Copy, serde::Serialize, serde::Deserialize)]
pub(crate) struct Outgoing {
    motion: usize,
    cursor: Cursor,
    remaining: f64,
}

/// The player's single "selected" motion, mixed at priority 0.
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub(crate) struct Selected {
    pub(crate) motion: Option<usize>,
    pub(crate) status: PlaybackStatus,
    /// Elapsed time counts from when the selection started fading in.
    pub(crate) cursor: Cursor,
    /// Previously selected motions fading out, oldest first; each keeps its fade-in and ends no
    /// later than it would have on its own (Cubism keeps every fading entry).
    pub(crate) outgoing: Vec<Outgoing>,
    /// A time reached by seeking or selecting shows without fades until playback resumes.
    pub(crate) scrubbed: bool,
    /// A pause also holds the fading motions, even once a one-shot selection finished.
    pub(crate) held: bool,
}

impl Selected {
    pub(crate) fn new(motion: Option<usize>, looped: bool) -> Self {
        Self {
            motion,
            status: PlaybackStatus::Playing,
            cursor: Cursor::new(looped, 1.0, None),
            outgoing: Vec::new(),
            scrubbed: false,
            held: false,
        }
    }

    /// Keeps the current motion playing as it fades out, if it has fade-out time left.
    pub(crate) fn release(&mut self, motions: &[Motion]) {
        let released = self
            .motion
            .filter(|_| self.status == PlaybackStatus::Playing)
            .and_then(|motion| {
                let definition = motions.get(motion)?;
                let left = self
                    .cursor
                    .until_end(definition.duration)
                    .unwrap_or(f64::INFINITY);
                let remaining = fade_out_time(definition).min(left);
                (remaining > 0.0).then_some(Outgoing {
                    motion,
                    cursor: self.cursor,
                    remaining,
                })
            });
        self.outgoing.extend(released);
    }

    fn advance_outgoing(&mut self, delta: f64, motions: &[Motion]) -> Vec<FiredMotionEvent> {
        let mut events = Vec::new();
        self.outgoing.retain_mut(|out| {
            let Some(motion) = motions.get(out.motion) else {
                return false;
            };
            let advanced = out.cursor.advance(motion, out.motion, delta);
            events.extend(advanced.events);
            out.remaining -= out.cursor.fade_step(delta, advanced.step);
            out.remaining > 0.0
        });
        events
    }

    /// Returns whether a non-looping motion completed during this step, and the events passed
    /// by the outgoing and the selected motion.
    pub(crate) fn advance(
        &mut self,
        delta: f64,
        motions: &[Motion],
    ) -> (bool, Vec<FiredMotionEvent>) {
        // Pausing holds the fading motions too.
        let mut events = if self.held {
            Vec::new()
        } else {
            self.advance_outgoing(delta, motions)
        };
        let Some((index, motion)) = self
            .motion
            .filter(|_| self.status == PlaybackStatus::Playing && self.cursor.speed != 0.0)
            .and_then(|index| Some((index, motions.get(index)?)))
        else {
            return (false, events);
        };
        let advanced = self.cursor.advance(motion, index, delta);
        // Once time passes again the motion fades as usual, even after a seek while playing.
        self.scrubbed &= advanced.step <= 0.0;
        events.extend(advanced.events);
        if advanced.completed {
            self.status = PlaybackStatus::Finished;
        }
        (advanced.completed, events)
    }

    /// The outgoing motions' frames, then the selected one's; a one-shot fades out at its end
    /// unless its time was reached by seeking or selecting (until playback resumes).
    pub(crate) fn frames(&self, motions: &[Motion]) -> Vec<MotionFrame> {
        let outgoing = self.outgoing.iter().map(|out| {
            out.cursor
                .frame(out.motion, !self.held, Some(out.remaining))
        });
        let selected = self
            .motion
            .filter(|_| self.status != PlaybackStatus::Stopped)
            .map(|motion| {
                let duration = motions.get(motion).map_or(0.0, |m| m.duration);
                let remaining = self.cursor.until_end(duration).filter(|_| !self.scrubbed);
                self.cursor
                    .frame(motion, self.status == PlaybackStatus::Playing, remaining)
            });
        outgoing.chain(selected).collect()
    }

    /// `isPlaying`: without a motion nothing plays, so automatic effects that rest during
    /// motions keep running.
    pub(crate) fn is_playing(&self) -> bool {
        (self.status == PlaybackStatus::Playing && self.cursor.speed > 0.0 && self.motion.is_some())
            || (!self.held && !self.outgoing.is_empty())
    }

    /// Seeks the selected motion, limited to its length; a finished one-shot sought before its
    /// end pauses so that it can resume, like an independent playback.
    pub(crate) fn seek(
        &mut self,
        time: f64,
        duration: impl Fn(usize) -> f64,
    ) -> Result<(), PlaybackError> {
        let time = validate_time(time)?;
        let length = self.motion.map(duration);
        self.cursor.seek(&mut self.status, time, length);
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn paused_outgoing_motions_hold_still() {
        let motion = |id: &str| -> Motion {
            serde_json::from_value(serde_json::json!(
                {"duration": 2, "id": id, "fadeOutTime": 0.5, "tracks": []}))
            .expect("motion")
        };
        let motions = [motion("a"), motion("b")];
        let mut selected = Selected::new(Some(0), true);
        selected.advance(0.5, &motions);
        selected.release(&motions);
        selected.motion = Some(1);
        selected.status = PlaybackStatus::Paused;
        selected.held = true;
        selected.advance(0.2, &motions);
        let frames = selected.frames(&motions);
        assert_eq!((frames[0].rate, frames[0].remaining), (0.0, Some(0.5)));
        assert!(!selected.is_playing());
    }

    #[test]
    fn a_selection_without_a_motion_is_not_playing() {
        assert!(!Selected::new(None, true).is_playing());
        assert!(Selected::new(Some(0), true).is_playing());
    }
}
