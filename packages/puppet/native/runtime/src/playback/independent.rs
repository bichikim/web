//! Independently started playbacks (`playback/create-motion-playbacks.ts`).

use poffo_format::document::Motion;

use super::{
    Cursor, FiredMotionEvent, PlaybackError, PlaybackHandle, PlaybackOptions, PlaybackState,
    PlaybackStatus, fade_out_time, validate_speed, validate_time, validate_weight,
};
use crate::motion::{MotionBlend, MotionFrame};

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
struct Playback {
    motion: usize,
    blend: MotionBlend,
    priority: f64,
    weight: f64,
    cursor: Cursor,
    status: PlaybackStatus,
    /// Seconds left of a requested fade-out (motion time, or real time while frozen).
    stopping: Option<f64>,
}

impl Playback {
    /// Seconds until the playback ends: a requested fade-out, or a one-shot's end.
    fn remaining(&self, duration: f64) -> Option<f64> {
        match (self.cursor.until_end(duration), self.stopping) {
            (Some(end), Some(stopping)) => Some(end.min(stopping)),
            (end, stopping) => end.or(stopping),
        }
    }

    /// Moves forward in time, or at least fades out when frozen at speed 0.
    fn advances(&self) -> bool {
        self.cursor.speed > 0.0 || self.stopping.is_some()
    }
}

#[derive(Debug, Clone, PartialEq)]
pub(crate) enum PlaybackNotice {
    Event(FiredMotionEvent),
    Completion(PlaybackHandle),
}

/// Independent playbacks in start order.
#[derive(Debug, Clone, Default, serde::Serialize, serde::Deserialize)]
pub(crate) struct Playbacks {
    entries: Vec<(PlaybackHandle, Playback)>,
    next_handle: u64,
    #[serde(skip)]
    pub(crate) notices: Vec<PlaybackNotice>,
}

impl Playbacks {
    pub(crate) fn start(
        &mut self,
        motion: usize,
        options: PlaybackOptions,
        motion_loop: Option<bool>,
    ) -> Result<PlaybackHandle, PlaybackError> {
        let options = options.validated()?;
        self.next_handle += 1;
        let handle = PlaybackHandle(self.next_handle);
        self.entries.push((
            handle,
            Playback {
                motion,
                blend: options.blend,
                priority: options.priority,
                weight: options.weight,
                cursor: Cursor::new(
                    options.looped.or(motion_loop).unwrap_or(true),
                    options.speed,
                    Some(0.0),
                ),
                status: PlaybackStatus::Playing,
                stopping: None,
            },
        ));
        Ok(handle)
    }

    fn get_mut(&mut self, handle: PlaybackHandle) -> Option<&mut Playback> {
        self.entries
            .iter_mut()
            .find(|(h, _)| *h == handle)
            .map(|(_, p)| p)
    }

    pub(crate) fn state(
        &self,
        handle: PlaybackHandle,
        duration: impl Fn(usize) -> f64,
    ) -> Option<PlaybackState> {
        let (_, p) = self.entries.iter().find(|(h, _)| *h == handle)?;
        Some(PlaybackState {
            motion: p.motion,
            duration: duration(p.motion),
            speed: p.cursor.speed,
            status: p.status,
            time: p.cursor.time,
            weight: p.weight,
        })
    }

    pub(crate) fn pause(&mut self, handle: PlaybackHandle) -> bool {
        self.get_mut(handle)
            .filter(|p| p.status == PlaybackStatus::Playing)
            .map(|p| p.status = PlaybackStatus::Paused)
            .is_some()
    }

    pub(crate) fn resume(&mut self, handle: PlaybackHandle) -> bool {
        self.get_mut(handle)
            .filter(|p| p.status == PlaybackStatus::Paused)
            .map(|p| p.status = PlaybackStatus::Playing)
            .is_some()
    }

    pub(crate) fn seek(
        &mut self,
        handle: PlaybackHandle,
        time: f64,
        duration: impl Fn(usize) -> f64,
    ) -> Result<bool, PlaybackError> {
        let time = validate_time(time)?;
        let Some(p) = self.get_mut(handle) else {
            return Ok(false);
        };
        p.cursor.seek(&mut p.status, time, Some(duration(p.motion)));
        Ok(true)
    }

    pub(crate) fn set_speed(
        &mut self,
        handle: PlaybackHandle,
        speed: f64,
    ) -> Result<bool, PlaybackError> {
        let speed = validate_speed(speed)?;
        Ok(self
            .get_mut(handle)
            .map(|p| p.cursor.speed = speed)
            .is_some())
    }

    pub(crate) fn set_weight(
        &mut self,
        handle: PlaybackHandle,
        weight: f64,
    ) -> Result<bool, PlaybackError> {
        let weight = validate_weight(weight)?;
        Ok(self.get_mut(handle).map(|p| p.weight = weight).is_some())
    }

    pub(crate) fn stop(&mut self, handle: PlaybackHandle) -> bool {
        let before = self.entries.len();
        self.entries.retain(|(h, _)| *h != handle);
        self.entries.len() != before
    }

    /// Fades the playback out over its motion's fade-out time (`fadeOut`), stopping it at once
    /// when that is 0 or the playback already finished (it no longer advances to fade).
    pub(crate) fn fade_out(&mut self, handle: PlaybackHandle, motions: &[Motion]) -> bool {
        let Some(p) = self.get_mut(handle) else {
            return false;
        };
        let time = motions.get(p.motion).map_or(0.0, fade_out_time);
        if time <= 0.0 || p.status == PlaybackStatus::Finished {
            return self.stop(handle);
        }
        p.stopping.get_or_insert(time);
        true
    }

    pub(crate) fn stop_all(&mut self) {
        self.entries.clear();
    }

    pub(crate) fn set_all(&mut self, from: PlaybackStatus, to: PlaybackStatus) {
        for (_, p) in &mut self.entries {
            if p.status == from {
                p.status = to;
            }
        }
    }

    pub(crate) fn is_playing(&self) -> bool {
        self.entries
            .iter()
            .any(|(_, p)| p.status == PlaybackStatus::Playing && p.advances())
    }

    /// Advances playing entries and drops faded-out ones; returns those that finished during
    /// this step and the events passed.
    pub(crate) fn advance(
        &mut self,
        delta: f64,
        motions: &[Motion],
    ) -> (Vec<PlaybackHandle>, Vec<FiredMotionEvent>) {
        self.notices.clear();
        let mut finished = Vec::new();
        let mut events = Vec::new();
        let mut faded = Vec::new();
        for (handle, p) in &mut self.entries {
            let Some(motion) = motions.get(p.motion) else {
                continue;
            };
            if p.status != PlaybackStatus::Playing || !p.advances() {
                continue;
            }
            let advanced = p.cursor.advance(motion, p.motion, delta);
            self.notices
                .extend(advanced.events.iter().cloned().map(PlaybackNotice::Event));
            events.extend(advanced.events);
            let fade_step = p.cursor.fade_step(delta, advanced.step);
            p.stopping = p.stopping.map(|s| s - fade_step);
            p.status = if advanced.completed {
                PlaybackStatus::Finished
            } else {
                PlaybackStatus::Playing
            };
            if p.stopping.is_some_and(|s| s <= 0.0) {
                faded.push(*handle);
            } else if advanced.completed {
                finished.push(*handle);
                self.notices.push(PlaybackNotice::Completion(*handle));
            }
        }
        self.entries.retain(|(h, _)| !faded.contains(h));
        (finished, events)
    }

    pub(crate) fn frames<'a>(
        &'a self,
        motions: &'a [Motion],
    ) -> impl Iterator<Item = MotionFrame> + 'a {
        self.entries.iter().map(move |(_, p)| {
            let duration = motions.get(p.motion).map_or(0.0, |m| m.duration);
            MotionFrame {
                blend: p.blend,
                priority: p.priority,
                weight: p.weight,
                ..p.cursor.frame(
                    p.motion,
                    p.status == PlaybackStatus::Playing,
                    p.remaining(duration),
                )
            }
        })
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn looping_wraps_and_one_shot_finishes() {
        let mut playbacks = Playbacks::default();
        let looped = playbacks
            .start(0, PlaybackOptions::default(), None)
            .expect("start");
        let once = playbacks
            .start(
                0,
                PlaybackOptions {
                    looped: Some(false),
                    ..PlaybackOptions::default()
                },
                None,
            )
            .expect("start");
        let motion: Motion =
            serde_json::from_value(serde_json::json!({"duration": 1, "id": "m", "tracks": []}))
                .expect("motion");
        let (finished, _) = playbacks.advance(1.5, std::slice::from_ref(&motion));
        assert_eq!(finished, vec![once]);
        assert!((playbacks.state(looped, |_| 1.0).expect("state").time - 0.5).abs() < 1e-12);
        assert_eq!(
            playbacks.state(once, |_| 1.0).expect("state").status,
            PlaybackStatus::Finished
        );
        assert!(playbacks.seek(once, 0.25, |_| 1.0).expect("seek"));
        assert_eq!(
            playbacks.state(once, |_| 1.0).expect("state").status,
            PlaybackStatus::Paused
        );
        assert!(
            playbacks
                .start(
                    0,
                    PlaybackOptions {
                        speed: -1.0,
                        ..PlaybackOptions::default()
                    },
                    None
                )
                .is_err()
        );
        assert!(playbacks.stop(looped));
        assert!(!playbacks.stop(looped));
    }

    #[test]
    fn a_frozen_motion_still_fades_out() {
        let motion: Motion = serde_json::from_value(serde_json::json!(
            {"duration": 1, "id": "idle", "fadeOutTime": 0.5, "tracks": []}))
        .expect("motion");
        let motions = [motion];
        let mut playbacks = Playbacks::default();
        let handle = playbacks
            .start(
                0,
                PlaybackOptions {
                    speed: 0.0,
                    ..PlaybackOptions::default()
                },
                None,
            )
            .expect("start");
        assert!(playbacks.fade_out(handle, &motions));
        assert!(playbacks.is_playing());
        playbacks.advance(0.25, &motions);
        let frame = playbacks.frames(&motions).next().expect("frame");
        assert!((frame.remaining.expect("remaining") - 0.25).abs() < 1e-12);
        assert_eq!(playbacks.state(handle, |_| 1.0).expect("state").time, 0.0);
        playbacks.advance(0.25, &motions);
        assert_eq!(playbacks.frames(&motions).count(), 0);
    }

    #[test]
    fn fading_out_a_finished_one_shot_removes_it() {
        let motion: Motion = serde_json::from_value(serde_json::json!(
            {"duration": 1, "id": "once", "fadeOutTime": 0.5, "tracks": []}))
        .expect("motion");
        let motions = [motion];
        let mut playbacks = Playbacks::default();
        let options = PlaybackOptions {
            looped: Some(false),
            ..PlaybackOptions::default()
        };
        let handle = playbacks.start(0, options, None).expect("start");
        assert_eq!(playbacks.advance(2.0, &motions).0, vec![handle]);
        assert!(playbacks.fade_out(handle, &motions));
        assert_eq!(playbacks.state(handle, |_| 1.0), None);
    }
}
