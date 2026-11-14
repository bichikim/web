//! Runtime for Poffo models: a Rust port of the TypeScript player's evaluation path.
//!
//! A [`Model`] compiles a validated [`poffo_format::Document`]; a [`Player`] owns playback
//! state (overrides, motions, physics) and produces a [`Frame`] each update: parameter
//! values, deformed vertices per part and the paint-ordered [`PartPlan`]s a renderer draws.
//! Deformed vertices are stored as `f32` at the same points as the TypeScript
//! `Float32Array`s so results match the reference player.

mod apply;
mod chain;
mod compose;
mod deform;
mod delaunay;
mod draw_order;
mod effects;
mod expression;
mod geometry;
mod geometry_cache;
mod grid_keyform;
mod hit;
mod influence;
mod keyform;
mod layers;
mod look;
mod model;
mod motion;
mod overrides;
mod parameter_blend;
mod physics;
mod plan;
mod playback;
mod player;
mod pose;
mod sound;
mod spatial;
mod viewport;
mod visibility;
mod voice;
mod worker;
pub use worker::{WorkerError, WorkerRuntime};

pub use chain::PhysicsOptions;
pub use effects::{DEFAULT_EYE_BLINK_TIMING, EyeBlinkTiming, SeededRandom};
pub use hit::triangle_contains;
pub use layers::{ColorEffect, LayerPlan, LayerProperties};
pub use look::{
    LOOK_MAXIMUM_SPEED, LOOK_TIME_TO_MAXIMUM_SPEED, LookPoint, advance_look_point,
    clamp_look_target,
};
pub use model::{MaskPlan, MaskSource, Model, PartProperties};
pub use motion::{MotionBlend, sample_discrete_keyframes, sample_keyframes};
pub use overrides::RenderOverride;
pub use parameter_blend::{ParameterBlend, ParameterBlendMode};
pub use physics::PendulumState;
pub use plan::PartPlan;
pub use playback::{
    FiredMotionEvent, PlaybackError, PlaybackHandle, PlaybackOptions, PlaybackState, PlaybackStatus,
};
pub use player::{Completions, Frame, MotionSelection, Player, SoundingMotion};
pub use sound::{MOTION_SOUND_WINDOW, Sound, WavError, decode_wav, motion_sound_window};
pub use spatial::SpatialPartPose;
pub use viewport::{Framing, ViewportFit, fit_framing};
pub use voice::{
    AnalyzeVowelsOptions, VowelAnalysis, VowelWeights, analyze_vowels, estimate_formants,
    measure_voice_level, normalize_vowel_weights,
};
