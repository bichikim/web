//! The selected motion and global playback controls on [`Player`] (`play`, `pause`, `seek`,
//! `setMotion`, `setPlaybackSpeed`).

use std::sync::Arc;

use super::{MotionSelection, Player};
use crate::playback::{Cursor, PlaybackError, PlaybackStatus, Selected, validate_speed};

impl Player {
    /// Pauses every playback, including the selected motion.
    pub fn pause(&mut self) {
        self.selected.held = self.selected.status != PlaybackStatus::Stopped;
        if self.selected.status == PlaybackStatus::Playing {
            self.selected.status = PlaybackStatus::Paused;
        }
        self.playbacks
            .set_all(PlaybackStatus::Playing, PlaybackStatus::Paused);
    }

    /// Resumes paused playbacks; a finished one-shot stays finished, like independent ones.
    pub fn resume(&mut self) {
        if self.selected.status != PlaybackStatus::Stopped {
            if self.selected.status == PlaybackStatus::Paused {
                self.selected.status = PlaybackStatus::Playing;
            }
            self.selected.held = false;
            self.selected.scrubbed = false;
        }
        self.playbacks
            .set_all(PlaybackStatus::Paused, PlaybackStatus::Playing);
    }

    /// Removes all motion contributions and rewinds the selected motion.
    pub fn stop(&mut self) {
        self.selected.status = PlaybackStatus::Stopped;
        self.selected.cursor.time = 0.0;
        self.selected.outgoing.clear();
        self.playbacks.stop_all();
        self.refresh();
    }

    /// The motion's own `loop`, or looping when it has none.
    fn motion_loops(&self, motion: Option<usize>) -> bool {
        motion
            .and_then(|m| self.model.document.motions.get(m)?.looping)
            .unwrap_or(true)
    }

    /// Plays the selected motion (`play`), reactivating it (fading in) after [`Self::stop`].
    /// `looped: None` uses the motion's `loop`.
    pub fn play(&mut self, looped: Option<bool>, speed: Option<f64>) -> Result<(), PlaybackError> {
        let speed = validate_speed(speed.unwrap_or(self.selected.cursor.speed))?;
        if self.selected.status == PlaybackStatus::Stopped {
            self.selected.cursor.elapsed = Some(0.0);
        }
        self.selected.status = PlaybackStatus::Playing;
        self.selected.held = false;
        self.selected.scrubbed = false;
        self.selected.cursor.speed = speed;
        self.selected.cursor.looped =
            looped.unwrap_or_else(|| self.motion_loops(self.selected.motion));
        self.refresh();
        Ok(())
    }

    /// Selects and restarts a motion (`playMotion`), cross-fading from the playing one by their
    /// fade times; `Ok(false)` for unknown motions. `looped: None` uses the motion's `loop`.
    pub fn play_motion(
        &mut self,
        id: &str,
        looped: Option<bool>,
        speed: f64,
    ) -> Result<bool, PlaybackError> {
        let Some(motion) = self.model.motion_index(id) else {
            return Ok(false);
        };
        self.play_motion_at(motion, looped, speed)?;
        Ok(true)
    }

    /// [`Self::play_motion`] for a motion index.
    pub(super) fn play_motion_at(
        &mut self,
        motion: usize,
        looped: Option<bool>,
        speed: f64,
    ) -> Result<(), PlaybackError> {
        let speed = validate_speed(speed)?;
        let model = Arc::clone(&self.model);
        self.selected.release(&model.document.motions);
        self.selected = Selected {
            motion: Some(motion),
            status: PlaybackStatus::Playing,
            cursor: Cursor::new(
                looped.unwrap_or_else(|| self.motion_loops(Some(motion))),
                speed,
                Some(0.0),
            ),
            outgoing: std::mem::take(&mut self.selected.outgoing),
            scrubbed: false,
            held: false,
        };
        self.refresh();
        Ok(())
    }

    /// Selects a motion without changing play state (`setMotion`). A stopped or finished
    /// selection becomes paused at the new motion's start, so [`Self::resume`] plays it.
    pub fn set_motion(&mut self, id: &str) -> MotionSelection {
        let Some(motion) = self.model.motion_index(id) else {
            return MotionSelection::Missing;
        };
        if self.selected.status != PlaybackStatus::Stopped && self.selected.motion == Some(motion) {
            return MotionSelection::Unchanged;
        }
        self.selected.motion = Some(motion);
        if matches!(
            self.selected.status,
            PlaybackStatus::Stopped | PlaybackStatus::Finished
        ) {
            self.selected.status = PlaybackStatus::Paused;
        }
        self.selected.cursor.time = 0.0;
        self.selected.cursor.looped = self.motion_loops(Some(motion));
        self.selected.cursor.elapsed = None;
        self.selected.scrubbed = true;
        self.selected.outgoing.clear();
        self.refresh();
        MotionSelection::Changed
    }

    pub fn seek(&mut self, time: f64) -> Result<(), PlaybackError> {
        self.selected.seek(time, self.model.motion_duration())?;
        self.selected.cursor.elapsed = None;
        self.selected.scrubbed = true;
        self.selected.outgoing.clear();
        self.refresh();
        Ok(())
    }

    pub fn set_playback_speed(&mut self, speed: f64) -> Result<(), PlaybackError> {
        self.selected.cursor.speed = validate_speed(speed)?;
        Ok(())
    }

    /// `(motion index, time, duration)` of the selected motion unless stopped.
    pub fn selected_motion(&self) -> Option<(usize, f64, f64)> {
        let motion = self
            .selected
            .motion
            .filter(|_| self.selected.status != PlaybackStatus::Stopped)?;
        Some((motion, self.selected.cursor.time, self.duration()(motion)))
    }
}
