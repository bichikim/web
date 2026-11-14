//! Automatic effects and motion groups on [`Player`] (`setEyeBlink`, `setLipSync`,
//! `setVowelWeights`, `setModelOpacity`, physics preview and options, `playGroup`).

use super::Player;
use crate::effects::{EyeBlink, EyeBlinkTiming, SeededRandom, pick_group_motion};
use crate::playback::PlaybackError;
use std::sync::Arc;

use crate::chain::PhysicsOptions;
use crate::overrides::RenderOverride;
use crate::parameter_blend::ParameterBlend;
use crate::sound::Sound;
use crate::voice::{VowelWeights, normalize_vowel_weights};

/// A motion whose sound is lasting, for playing it in step (`motion` indexes the document's
/// motions; `time` is the sound's position in seconds; `rate` is 0 while paused).
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct SoundingMotion {
    pub motion: usize,
    pub time: f64,
    pub rate: f64,
    pub weight: f64,
}

impl Player {
    /// Eye openness from the automatic blink, which rests while the selected motion plays.
    pub(super) fn blink(&mut self, delta: f64) -> Option<f64> {
        if self.selected.is_playing() {
            return None;
        }
        let random = &mut self.random;
        self.eye_blink
            .as_mut()
            .map(|blink| blink.advance(delta, self.eye_blink_timing, random))
    }

    /// Restarts the random numbers behind eye blinks and motion groups, rescheduling an
    /// active blink from them.
    pub fn set_random_seed(&mut self, seed: i64) {
        self.random = SeededRandom::new(seed);
        if self.eye_blink.is_some() {
            self.eye_blink = Some(EyeBlink::new(self.eye_blink_timing, &mut self.random));
        }
    }

    /// Blinks the eye-blink role parameters automatically while no selected motion plays.
    pub fn set_eye_blink(&mut self, enabled: bool) {
        if enabled == self.eye_blink.is_some() {
            return;
        }
        self.eye_blink = enabled.then(|| EyeBlink::new(self.eye_blink_timing, &mut self.random));
        self.refresh();
    }

    /// Blink timing (`setEyeBlinkTiming`); `None` restores the defaults. Invalid timing
    /// (`EyeBlinkTiming::is_valid`) returns `false` and changes nothing. The blink already
    /// scheduled keeps its time.
    pub fn set_eye_blink_timing(&mut self, timing: Option<EyeBlinkTiming>) -> bool {
        let timing = timing.unwrap_or_default();
        if !timing.is_valid() {
            return false;
        }
        self.eye_blink_timing = timing;
        true
    }

    /// Breathes with the document's `breath` parameters, added after motions and before
    /// physics; turning it on starts the waves from 0 seconds.
    pub fn set_breath(&mut self, enabled: bool) {
        if self.look_and_breath.set_breath(enabled) {
            self.refresh();
        }
    }

    /// Where the document's `look` parameters look, `-1..=1` (x right, y up); the look point
    /// follows with limited speed. `None` returns it to the center.
    pub fn set_look_target(&mut self, target: Option<[f64; 2]>) {
        self.look_and_breath.set_look_target(target);
    }

    /// Adds a mouth level to the lip-sync role parameters after physics; `None` stops.
    pub fn set_lip_sync(&mut self, level: Option<f64>) {
        self.lip_sync = level.filter(|l| l.is_finite());
        self.refresh();
    }

    /// Vowel weights (`a`, `i`, `u`, `e`, `o`), such as [`crate::analyze_vowels`] results, that
    /// blend the document's mouth shapes after physics. Shown weights follow with the shapes'
    /// smoothing; `None` fades them out.
    pub fn set_vowel_weights(&mut self, weights: Option<VowelWeights>) {
        self.voice_target = weights.map(normalize_vowel_weights);
        self.refresh();
    }

    /// Sets the decoded sound of motion `motion` (an index into the document's motions), or
    /// clears it; `false` for an unknown index, zero sample rate or inconsistent channels.
    /// A playing motion's sound drives the mouth at
    /// the motion time, ahead of [`Self::set_vowel_weights`] and [`Self::set_lip_sync`].
    pub fn set_motion_sound(&mut self, motion: usize, sound: Option<Arc<Sound>>) -> bool {
        let Some(slot) = self.motion_sounds.get_mut(motion) else {
            return false;
        };
        if sound.as_ref().is_some_and(|s| {
            s.sample_rate == 0
                || s.channels.is_empty()
                || s.channels.iter().any(|c| c.len() != s.mono.len())
        }) {
            return false;
        }
        *slot = sound;
        self.refresh();
        true
    }

    /// Motions whose loaded sound lasts at their current time, in frame order (the selected
    /// motion's, then independent playbacks'), for an app that plays the audio.
    pub fn sounding_motions(&self) -> Vec<SoundingMotion> {
        let motions = &self.model.document.motions;
        self.selected
            .frames(motions)
            .into_iter()
            .chain(self.playbacks.frames(motions))
            .filter_map(|frame| {
                let sound = self.motion_sounds.get(frame.motion)?.as_ref()?;
                (frame.time >= 0.0 && frame.time < sound.duration()).then_some(SoundingMotion {
                    motion: frame.motion,
                    time: frame.time,
                    rate: frame.rate,
                    weight: match motions.get(frame.motion).and_then(|m| m.sound.as_ref()) {
                        Some(sound)
                            if sound.volume
                                == Some(poffo_format::document::SoundVolume::Source)
                                || (sound.volume.is_none()
                                    && sound.analysis
                                        == Some(poffo_format::document::SoundAnalysis::Rms)) =>
                        {
                            1.0
                        }
                        _ => frame.weight,
                    },
                })
            })
            .collect()
    }

    /// Overrides a part's opacity, colors and culling (`setPartOverride`); `None` clears it.
    /// `false` for unknown ids.
    pub fn set_part_override(&mut self, id: &str, value: Option<RenderOverride>) -> bool {
        let Some(part) = self.model.part_index(id) else {
            return false;
        };
        match value.and_then(RenderOverride::normalized) {
            Some(value) => self.render_overrides.parts.insert(part, value),
            None => self.render_overrides.parts.remove(&part),
        };
        self.refresh();
        true
    }

    /// Overrides a scene group's own opacity and its parts' colors (`setGroupOverride`); `None`
    /// clears it. `false` for unknown ids and deformers.
    pub fn set_group_override(&mut self, id: &str, value: Option<RenderOverride>) -> bool {
        let Some(group) = self
            .model
            .group_ids
            .iter()
            .position(|candidate| candidate == id)
            .filter(|&group| !self.model.groups[group].deformer)
        else {
            return false;
        };
        match value.and_then(RenderOverride::normalized) {
            Some(value) => self.render_overrides.groups.insert(group, value),
            None => self.render_overrides.groups.remove(&group),
        };
        self.refresh();
        true
    }

    /// Enables inertia; when disabled, physics outputs sit at their static equilibrium.
    pub fn set_physics_preview(&mut self, enabled: bool) {
        if self.physics_preview != enabled {
            self.physics_preview = enabled;
            self.apply_frame(0.0, true);
        }
    }

    /// Removes inertia at the current pose without changing motion time.
    pub fn reset_physics(&mut self) {
        self.apply_frame(0.0, true);
    }

    /// Overwrites, adds to or multiplies a parameter after motions and expressions by a weight
    /// (`setParameterBlend`; Cubism's parameter operations) until cleared with `None`; look,
    /// breath and physics follow. `false` for unknown ids and non-finite numbers.
    pub fn set_parameter_blend(&mut self, id: &str, blend: Option<ParameterBlend>) -> bool {
        let normalized = blend.map(ParameterBlend::normalized);
        let Some(index) = self.model.parameter_index(id) else {
            return false;
        };
        if normalized == Some(None) {
            return false;
        }
        self.parameter_blends[index] = normalized.flatten();
        self.refresh();
        true
    }

    /// Replaces the document's chain gravity and wind (`setPhysicsOptions`); `None` restores
    /// them. Invalid options (`PhysicsOptions::is_valid`) return `false` and change nothing.
    pub fn set_physics_options(&mut self, options: Option<PhysicsOptions>) -> bool {
        let options = options.unwrap_or_default();
        if !options.is_valid() {
            return false;
        }
        self.physics_options = options;
        self.refresh();
        true
    }

    /// Scales every part's opacity (clamped to 0..1); motions' model opacity tracks start from
    /// it. Non-finite input is ignored.
    pub fn set_model_opacity(&mut self, opacity: f64) {
        if !opacity.is_finite() {
            return;
        }
        self.model_opacity = opacity.clamp(0.0, 1.0);
        self.refresh();
    }

    /// Plays a random motion of `group` (`playGroup`); returns its index.
    pub fn play_group(
        &mut self,
        group: &str,
        looped: Option<bool>,
        speed: f64,
    ) -> Result<Option<usize>, PlaybackError> {
        let model = std::sync::Arc::clone(&self.model);
        let Some(motion) = pick_group_motion(&model.document, group, &mut self.random) else {
            return Ok(None);
        };
        self.play_motion_at(motion, looped, speed)?;
        Ok(Some(motion))
    }
}
