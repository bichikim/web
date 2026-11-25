//! Evaluation of motion, effects, and geometry for the current playback state.
use std::sync::Arc;

use poffo_format::document::MouthShapes;
use poffo_format::resolve_parameter_value;

use super::{Player, vertices};
use crate::apply::{apply_glue, apply_scene_deformers};
use crate::chain;
use crate::effects::apply_lip_sync;
use crate::layers::LayerPlan;
use crate::motion::{MixEffects, MotionFrame};
use crate::parameter_blend::apply_parameter_blends;
use crate::physics::{self, PhysicsStep};
use crate::plan::PartPlan;
use crate::pose;
use crate::sound::motion_sound_mouth;
use crate::voice::{MouthShapesState, apply_mouth_shapes, normalize_vowel_weights};

/// The evaluated pose of one frame.
#[derive(Debug, Clone, Default, PartialEq)]
pub struct Frame {
    /// Parameter values after motions, overrides and physics, indexed like the document.
    pub parameter_values: Vec<f64>,
    /// [`Self::parameter_values`] clamped and snapped to options (`getParameterValues`).
    pub resolved_values: Vec<f64>,
    /// Deformed XY vertices per part, indexed like the document's parts.
    pub vertices: Vec<Vec<f32>>,
    /// Parts in paint order with resolved render properties.
    pub plans: Vec<PartPlan>,
    /// Offscreen groups, indexed by [`PartPlan::layers`]; outer layers come first.
    pub layers: Vec<LayerPlan>,
    pub spatial_poses: std::collections::HashMap<usize, crate::spatial::SpatialPartPose>,
}

impl Player {
    /// The latest frame, re-evaluated (without advancing time) if inputs changed.
    pub fn frame(&mut self) -> &Frame {
        if self.dirty {
            self.apply_frame(0.0, !self.physics_preview);
        }
        &self.frame
    }

    pub(super) fn apply_frame(&mut self, delta: f64, settle: bool) {
        let model = Arc::clone(&self.model);
        let motions = &model.document.motions;
        let frames: Vec<MotionFrame> = self
            .selected
            .frames(motions)
            .into_iter()
            .chain(self.playbacks.frames(motions))
            .collect();
        let signature: Vec<_> = frames
            .iter()
            .map(|f| (f.motion, f.time, f.elapsed, f.remaining))
            .collect();
        if signature != self.motion_frames {
            self.motion_base = self.motion_values.clone();
            self.motion_frames = signature;
        }
        let eye_openness = self.blink(delta);
        let groups: Vec<_> = self
            .expression_layers
            .iter()
            .map(|(_, playback)| playback.layers())
            .collect();
        let mix = model.mix_frames(
            &frames,
            &self.expressions.layers(),
            &self.overrides,
            MixEffects {
                eye_openness,
                model_opacity: self.model_opacity,
            },
            model
                .document
                .motion_parameter_base
                .and(Some(self.motion_base.as_slice())),
            &groups,
        );
        self.motion_values = mix.motion_parameter_values.clone();
        let mut values = mix.parameter_values.clone();
        apply_parameter_blends(
            &model.document.parameters,
            &self.parameter_blends,
            &mut values,
        );
        self.look_and_breath.apply(
            &model.document,
            |id| model.parameter_index(id),
            &mut values,
            delta,
        );
        let base = values.clone();
        let parameters = &model.document.parameters;
        if let Some(held) = self.physics_release.take()
            && let Some(chains) = &mut self.chains
            && let Some(physics) = &model.document.physics
        {
            for (index, pendulum) in physics.pendulums.iter().enumerate() {
                if let (Some(input), Some(output)) = (
                    model.parameter_index(&pendulum.input_parameter_id),
                    model.parameter_index(&pendulum.output_parameter_id),
                ) && let Some(value) = held[output]
                    && let Some(state) = physics::release(
                        pendulum,
                        &parameters[input],
                        &parameters[output],
                        (base[input], base[output], value),
                    )
                {
                    self.physics[index] = state;
                }
            }
            chain::release(
                physics,
                |id| model.parameter_index(id),
                parameters,
                chains,
                (&base, &held),
                self.physics_options,
            );
        }
        let step = PhysicsStep { delta, settle };
        for (index, pendulum) in model
            .document
            .physics
            .iter()
            .flat_map(|p| p.pendulums.iter().enumerate())
        {
            let (Some(input), Some(output)) = (
                model.parameter_index(&pendulum.input_parameter_id),
                model.parameter_index(&pendulum.output_parameter_id),
            ) else {
                continue;
            };
            let (state, value) = physics::evaluate(
                pendulum,
                &parameters[input],
                &parameters[output],
                (values[input], base[output]),
                self.physics[index],
                step,
            );
            self.physics[index] = state;
            values[output] = value;
        }
        {
            let fallback = poffo_format::document::Physics::default();
            let physics = model.document.physics.as_ref().unwrap_or(&fallback);
            chain::evaluate(
                physics,
                |id| model.parameter_index(id),
                parameters,
                &mut values,
                &mut self.chains,
                self.physics_options,
                (delta, settle),
            );
        }
        apply_parameter_blends(parameters, &self.after_physics_blends, &mut values);
        let sound_mouth = motion_sound_mouth(
            &frames,
            |motion| self.motion_sounds.get(motion).and_then(Option::as_deref),
            &model.document.motions,
            delta,
        );
        let smoothing = model
            .document
            .mouth_shapes
            .as_ref()
            .and_then(|s| s.smoothing)
            .unwrap_or(MouthShapes::DEFAULT_SMOOTHING);
        let target = sound_mouth
            .filter(|_| model.document.mouth_shapes.is_some())
            .map(|mouth| normalize_vowel_weights(mouth.weights))
            .or(self.voice_target);
        self.mouth = match (self.mouth, target) {
            (None, None) => None,
            (mouth, target) => MouthShapesState {
                shown: mouth.map_or([0.0; 5], |m| m.shown),
                target,
            }
            .advance(delta, smoothing),
        };
        if let (Some(shapes), Some(mouth)) = (&model.document.mouth_shapes, self.mouth) {
            apply_mouth_shapes(
                &model.document,
                shapes,
                |id| model.parameter_index(id),
                &mut values,
                mouth.shown,
            );
        }
        // Without mouth shapes, a motion sound's loudness opens the mouth (volume lip sync).
        let lip_sync = match (sound_mouth, &model.document.mouth_shapes) {
            (Some(mouth), None) => Some(mouth.level),
            _ => self.lip_sync,
        };
        if let Some(level) = lip_sync {
            apply_lip_sync(
                &model.document,
                |id| model.parameter_index(id),
                &mut values,
                level,
            );
        }

        apply_parameter_blends(parameters, &self.interaction_blends, &mut values);
        let (pose_state, pose_opacity) = pose::evaluate(
            &model.document,
            |id| model.part_index(id),
            &values,
            self.pose.as_ref(),
            delta,
            self.pose.is_none(),
        );
        self.pose = Some(pose_state);
        self.pose_cache.prepare(&model, &values);
        let posed = self.pose_cache.pose(&model, &values);
        let poses = model.spatial_poses(&posed);
        let (plans, layers) = model.plan_frame(
            &values,
            &poses,
            (&pose_opacity, &mix, &self.render_overrides),
        );
        let required = self
            .render_geometry_only
            .then(|| vertices::required_parts(&model, &plans));
        let required = required.as_deref();
        let mut vertices = std::mem::take(&mut self.frame.vertices);
        vertices.resize_with(model.parts.len(), Vec::new);
        vertices::compose_vertices(
            &model,
            &values,
            &mix,
            &poses,
            &mut vertices,
            &mut self.vertex_scratch,
            required,
        );
        if let Some(batch) = &mut self.deferred {
            crate::apply::apply_scene_geometry(
                &model,
                &posed,
                &mut self.geometry_cache,
                &mut vertices,
                Some(batch),
                required,
            );
        } else {
            apply_scene_deformers(
                &model,
                &posed,
                &mut self.geometry_cache,
                &mut vertices,
                required,
            );
            let glue = self.glue_cache.resolve(&model, &values);
            let connections = glue.connections(&model);
            if let Some(required) = required {
                apply_glue(
                    connections.filter(|connection| {
                        required[connection.first_part] && required[connection.second_part]
                    }),
                    &mut vertices,
                );
            } else {
                apply_glue(connections, &mut vertices);
            }
        }

        drop(posed);
        self.frame = Frame {
            resolved_values: parameters
                .iter()
                .zip(&values)
                .map(|(p, &v)| resolve_parameter_value(p, Some(v)))
                .collect(),
            parameter_values: values,
            vertices,
            plans,
            layers,
            spatial_poses: poses,
        };
        self.dirty = false;
    }
}
