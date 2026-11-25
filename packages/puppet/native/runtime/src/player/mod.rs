//! The playback controller (`player/create-player.ts` without rendering).

use std::sync::Arc;

use poffo_format::resolve_parameter_value;

use crate::chain::{self, ChainsState, PhysicsOptions};
use crate::effects::{EyeBlink, EyeBlinkTiming, SeededRandom};
use crate::expression::ExpressionPlayback;
use crate::look::LookAndBreath;
use crate::model::Model;
use crate::overrides::RenderOverrides;
use crate::parameter_blend::ParameterBlend;
use crate::physics::PendulumState;
use crate::playback::FiredMotionEvent;
use crate::playback::{PlaybackHandle, Playbacks, Selected};
use crate::pose::{self, PoseState};
use crate::sound::Sound;
use crate::voice::{MouthShapesState, VowelWeights};

mod effects;
mod frame;
mod playbacks;
mod selection;
mod vertices;
mod worker;

pub use effects::SoundingMotion;
pub use frame::Frame;

/// Seed of a new player's random numbers; `set_random_seed` replaces it.
const DEFAULT_RANDOM_SEED: i64 = 1;

/// What finished, and which motion events were passed, during [`Player::update`].
#[derive(Debug, Clone, Default, PartialEq)]
pub struct Completions {
    pub(crate) selected_events: Vec<FiredMotionEvent>,
    pub(crate) independent_notices: Vec<crate::playback::PlaybackNotice>,
    /// The selected (priority 0) motion finished a non-looping run.
    pub selected: bool,
    pub playbacks: Vec<PlaybackHandle>,
    /// In the order the TypeScript player reports them: the outgoing and the selected motion's,
    /// then the independent playbacks'.
    pub events: Vec<FiredMotionEvent>,
}

/// Result of [`Player::set_motion`].
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum MotionSelection {
    Changed,
    Unchanged,
    Missing,
}

pub struct Player {
    pub(crate) model: Arc<Model>,
    overrides: Vec<Option<f64>>,
    expressions: ExpressionPlayback,
    expression_layers: Vec<(String, ExpressionPlayback)>,
    /// `None` until the first frame, which shows pose selections without fading.
    pose: Option<PoseState>,
    selected: Selected,
    playbacks: Playbacks,
    physics: Vec<PendulumState>,
    /// Physics chain state; `None` until the first frame.
    chains: Option<ChainsState>,
    /// Random numbers for eye blinks and motion groups.
    random: SeededRandom,
    /// Automatic eye blink; `None` when disabled.
    eye_blink: Option<EyeBlink>,
    eye_blink_timing: EyeBlinkTiming,
    /// Mouth level added to the lip-sync parameters after physics.
    lip_sync: Option<f64>,
    /// The look point and breathing, added after motions and before physics.
    look_and_breath: LookAndBreath,
    /// Render values the app sets on parts and scene groups.
    render_overrides: RenderOverrides,
    /// Vowel weights blending the mouth shapes after physics; `None` when faded out.
    mouth: Option<MouthShapesState>,
    /// Weights from `set_vowel_weights`; playing motion sounds take over while they last.
    voice_target: Option<VowelWeights>,
    /// Decoded motion sounds, indexed like the document's motions.
    pub(crate) motion_sounds: Vec<Option<Arc<Sound>>>,
    /// Scales every part's opacity; motions' opacity tracks start from it.
    model_opacity: f64,
    physics_preview: bool,
    physics_release: Option<Vec<Option<f64>>>,
    /// App blends after motions and expressions, indexed like the document's parameters.
    parameter_blends: Vec<Option<ParameterBlend>>,
    after_physics_blends: Vec<Option<ParameterBlend>>,
    interaction_blends: Vec<Option<ParameterBlend>>,
    pub(crate) worker_state: serde_json::Value,
    /// Gravity and wind the app sets for chains in place of the document's.
    physics_options: PhysicsOptions,
    pub(crate) frame: Frame,
    dirty: bool,
    pub(crate) glue_cache: crate::glue_cache::GlueCache,
    pub(crate) geometry_cache: crate::geometry_cache::GeometryCache,
    pub(crate) deferred: Option<crate::deferred::DeferredGeometry>,
    pub(crate) render_geometry_only: bool,
    pose_cache: crate::pose_cache::PoseCache,
    vertex_scratch: Vec<Vec<f64>>,
    motion_frames: Vec<(usize, f64, Option<f64>, Option<f64>)>,
    motion_values: Vec<f64>,
    motion_base: Vec<f64>,
}

impl Player {
    /// Starts with the first motion selected and playing, like the TypeScript player.
    pub fn new(model: Arc<Model>) -> Self {
        let first = model.document.motions.first();
        let mut selected = Selected::new(
            first.map(|_| 0),
            first.and_then(|m| m.looping).unwrap_or(true),
        );
        if model.document.motion_parameter_base.is_some() {
            selected.cursor.elapsed = Some(0.0);
        }
        let pendulums = model
            .document
            .physics
            .as_ref()
            .map_or(0, |p| p.pendulums.len());
        let parameters = model.document.parameters.len();
        let glue_cache = crate::glue_cache::GlueCache::new(&model);
        let mut player = Self {
            glue_cache,
            overrides: vec![None; model.document.parameters.len()],
            physics: vec![PendulumState::default(); pendulums],
            chains: None,
            random: SeededRandom::new(DEFAULT_RANDOM_SEED),
            eye_blink: None,
            eye_blink_timing: EyeBlinkTiming::default(),
            lip_sync: None,
            look_and_breath: LookAndBreath::default(),
            render_overrides: RenderOverrides::default(),
            mouth: None,
            voice_target: None,
            motion_sounds: vec![None; model.document.motions.len()],
            model_opacity: 1.0,
            expressions: ExpressionPlayback::default(),
            expression_layers: Vec::new(),
            worker_state: serde_json::Value::Null,
            pose: None,
            model,
            selected,
            playbacks: Playbacks::default(),
            physics_preview: true,
            physics_release: None,
            parameter_blends: vec![None; parameters],
            after_physics_blends: vec![None; parameters],
            interaction_blends: vec![None; parameters],
            physics_options: PhysicsOptions::default(),
            frame: Frame::default(),
            dirty: true,
            geometry_cache: crate::geometry_cache::GeometryCache::default(),
            deferred: None,
            render_geometry_only: false,
            pose_cache: crate::pose_cache::PoseCache::default(),
            vertex_scratch: Vec::new(),
            motion_frames: Vec::new(),
            motion_values: Vec::new(),
            motion_base: Vec::new(),
        };
        player.apply_frame(0.0, false);
        player
    }

    pub fn model(&self) -> &Arc<Model> {
        &self.model
    }

    fn duration(&self) -> impl Fn(usize) -> f64 + '_ {
        self.model.motion_duration()
    }

    /// Advances time by `delta` seconds and evaluates the frame (the ticker callback).
    pub fn update(&mut self, delta: f64) -> Completions {
        let delta = if delta.is_finite() {
            delta.max(0.0)
        } else {
            0.0
        };
        let model = Arc::clone(&self.model);
        let (playbacks, playback_events) = self.playbacks.advance(delta, &model.document.motions);
        let (selected, selected_events) = self.selected.advance(delta, &model.document.motions);
        let mut events = selected_events.clone();
        events.extend(playback_events);
        self.expressions
            .advance(delta, &self.model.document.expressions);
        self.expression_layers.retain_mut(|(_, playback)| {
            playback.advance(delta, &self.model.document.expressions);
            !playback.layers().is_empty()
        });
        self.apply_frame(delta, !self.physics_preview);
        Completions {
            selected_events,
            independent_notices: self.playbacks.notices.clone(),
            selected,
            playbacks,
            events,
        }
    }

    fn refresh(&mut self) {
        self.dirty = true;
    }

    /// Value used by the latest frame (resolved), or `None` for unknown ids.
    pub fn parameter_value(&mut self, id: &str) -> Option<f64> {
        let index = self.model.parameter_index(id)?;
        self.frame().resolved_values.get(index).copied()
    }

    /// Overrides one parameter after motion mixing; returns `false` for unknown ids.
    pub fn set_parameter_value(&mut self, id: &str, value: f64) -> bool {
        let Some(index) = self.model.parameter_index(id) else {
            return false;
        };
        self.overrides[index] = Some(resolve_parameter_value(
            &self.model.document.parameters[index],
            Some(value),
        ));
        self.refresh();
        true
    }

    /// Replaces all overrides; unknown ids are ignored.
    pub fn set_parameter_values<'a>(&mut self, values: impl IntoIterator<Item = (&'a str, f64)>) {
        self.overrides.iter_mut().for_each(|o| *o = None);
        for (id, value) in values {
            if let Some(index) = self.model.parameter_index(id) {
                self.overrides[index] = Some(resolve_parameter_value(
                    &self.model.document.parameters[index],
                    Some(value),
                ));
            }
        }
        self.refresh();
    }

    /// Releases overrides so motions control the parameters again; `None` releases all.
    pub fn clear_parameter_values(&mut self, ids: Option<&[&str]>) {
        match ids {
            None => self.overrides.iter_mut().for_each(|o| *o = None),
            Some(ids) => {
                for id in ids {
                    if let Some(index) = self.model.parameter_index(id) {
                        self.overrides[index] = None;
                    }
                }
            }
        }
        self.refresh();
    }

    /// Pins parameters to their defaults; `None` resets all.
    pub fn reset_parameters(&mut self, ids: Option<&[&str]>) {
        for (index, parameter) in self.model.document.parameters.iter().enumerate() {
            if ids.is_none_or(|ids| ids.contains(&parameter.id.as_str())) {
                self.overrides[index] = Some(parameter.default_value);
            }
        }
        self.refresh();
    }

    /// Whether anything animates (motions playing or physics active).
    pub fn is_animating(&self) -> bool {
        let physics =
            self.physics_preview && !(self.physics.is_empty() && model_has_no_chains(&self.model));
        // Effects the document has no parameters for show nothing.
        let document = &self.model.document;
        let blinks = self.eye_blink.is_some() && !document.parameter_roles.eye_blink.is_empty();
        let mouth = document.mouth_shapes.is_some()
            && (self.mouth.is_some() || self.voice_target.is_some());
        self.selected.is_playing()
            || blinks
            || self.playbacks.is_playing()
            || physics
            || self.expressions.is_animating()
            || self.expression_layers.iter().any(|(_, p)| p.is_animating())
            || self.pose.as_ref().is_some_and(pose::is_fading)
            || mouth
            || self.look_and_breath.is_animating(document)
    }

    // Expressions and hit areas.

    /// Cross-fades to the expression `id`; `None` fades the current one out. `false` for
    /// unknown ids.
    pub fn set_expression(&mut self, id: Option<&str>) -> bool {
        let index = match id {
            Some(id) => match self
                .model
                .document
                .expressions
                .iter()
                .position(|e| e.id == id)
            {
                Some(index) => Some(index),
                None => return false,
            },
            None => None,
        };
        let model = Arc::clone(&self.model);
        self.expressions.set(index, &model.document.expressions);
        self.refresh();
        true
    }

    /// The expression fading in or held, if any.
    pub fn expression(&self) -> Option<&str> {
        let index = self.expressions.current()?;
        self.model
            .document
            .expressions
            .get(index)
            .map(|e| e.id.as_str())
    }

    /// Hit area under `point` (document coordinates) on the latest frame.
    pub fn hit_area(&mut self, point: [f64; 2]) -> Option<String> {
        let model = Arc::clone(&self.model);
        model.hit_area(self.frame(), point).map(str::to_owned)
    }
}

fn model_has_no_chains(model: &Model) -> bool {
    model
        .document
        .physics
        .as_ref()
        .is_none_or(|p| p.chains.is_empty())
}
