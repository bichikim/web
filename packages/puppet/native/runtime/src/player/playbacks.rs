//! Independent playbacks on [`Player`] (`startMotion` handles).

use std::sync::Arc;

use super::Player;
use crate::playback::{PlaybackError, PlaybackHandle, PlaybackOptions, PlaybackState};

impl Player {
    /// Starts an independent playback; `Ok(None)` for unknown motions.
    pub fn start_motion(
        &mut self,
        id: &str,
        options: PlaybackOptions,
    ) -> Result<Option<PlaybackHandle>, PlaybackError> {
        let Some(motion) = self.model.motion_index(id) else {
            return Ok(None);
        };
        let motion_loop = self.model.document.motions[motion].looping;
        let handle = self.playbacks.start(motion, options, motion_loop)?;
        self.refresh();
        Ok(Some(handle))
    }

    /// Fades a playback out over its motion's fade-out time, then removes it (`fadeOut`);
    /// stops it at once when that time is 0. Returns `false` for unknown handles.
    pub fn fade_out_playback(&mut self, handle: PlaybackHandle) -> bool {
        let model = Arc::clone(&self.model);
        let found = self.playbacks.fade_out(handle, &model.document.motions);
        self.refresh();
        found
    }

    pub fn playback_state(&self, handle: PlaybackHandle) -> Option<PlaybackState> {
        self.playbacks.state(handle, self.duration())
    }

    pub fn pause_playback(&mut self, handle: PlaybackHandle) -> bool {
        let changed = self.playbacks.pause(handle);
        self.refresh();
        changed
    }

    pub fn resume_playback(&mut self, handle: PlaybackHandle) -> bool {
        let changed = self.playbacks.resume(handle);
        self.refresh();
        changed
    }

    pub fn seek_playback(
        &mut self,
        handle: PlaybackHandle,
        time: f64,
    ) -> Result<bool, PlaybackError> {
        let found = self
            .playbacks
            .seek(handle, time, self.model.motion_duration())?;
        self.refresh();
        Ok(found)
    }

    pub fn set_playback_speed_of(
        &mut self,
        handle: PlaybackHandle,
        speed: f64,
    ) -> Result<bool, PlaybackError> {
        let found = self.playbacks.set_speed(handle, speed)?;
        self.refresh();
        Ok(found)
    }

    pub fn set_playback_weight(
        &mut self,
        handle: PlaybackHandle,
        weight: f64,
    ) -> Result<bool, PlaybackError> {
        let found = self.playbacks.set_weight(handle, weight)?;
        self.refresh();
        Ok(found)
    }

    pub fn stop_playback(&mut self, handle: PlaybackHandle) -> bool {
        let found = self.playbacks.stop(handle);
        self.refresh();
        found
    }
}
