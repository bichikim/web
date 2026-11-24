//! At most three owned geometry frames. Device completion never reads a newer simulation pose.
use super::{WorkerError, WorkerRuntime};
use crate::{Player, apply::apply_glue, deferred::DeferredGeometry};

#[derive(Default)]
pub(super) struct GeometrySlot {
    pub(super) active: bool,
    id: u32,
    sources: Vec<Vec<f32>>,
    output: Vec<f32>,
    batch: DeferredGeometry,
    glue: std::sync::Arc<crate::glue_cache::GluePose>,
    stamps: Vec<Vec<u64>>,
    corrections: Vec<u32>,
    packet: Vec<f64>,
}
impl GeometrySlot {
    fn capture(&mut self, id: u32, player: &mut Player, points: &mut Vec<f32>) {
        self.active = true;
        self.id = id;
        self.sources
            .resize_with(player.frame.vertices.len(), Vec::new);
        for (source, current) in self.sources.iter_mut().zip(&player.frame.vertices) {
            source.resize(current.len(), 0.0);
        }
        // The host copied the numerical frame before taking this ticket. Recycle the
        // slot's old allocation for the next output and retain this frame's owned buffer.
        std::mem::swap(&mut self.output, points);
        points.clear();
        let batch = player.deferred.as_mut().unwrap();
        self.batch.jobs.clone_from(&batch.jobs);
        self.stamps.resize_with(self.sources.len(), Vec::new);
        for job in &batch.jobs {
            self.sources[job.part].clone_from(&player.frame.vertices[job.part]);
            player
                .geometry_cache
                .defer(job.part, &mut self.stamps[job.part]);
        }
        self.glue = player
            .glue_cache
            .resolve(&player.model, &player.frame.parameter_values);
        crate::geometry_frame::encode_frame(&mut self.packet, &self.batch.jobs, &self.glue.changes);
        batch.pending = false;
        batch.commands.clear();
        batch.values.clear();
        self.corrections.clear();
    }
    fn cache(&mut self, player: &mut Player) {
        for job in &self.batch.jobs {
            let range = job.start * 2..(job.start + job.count) * 2;
            player.geometry_cache.complete(
                job.part,
                &self.stamps[job.part],
                &self.sources[job.part],
                &self.output[range],
            );
        }
    }
    fn finish(&mut self, player: &mut Player, all: bool) -> Result<(), WorkerError> {
        self.batch
            .correct(&self.sources, &mut self.output, &self.corrections, all)
            .map_err(WorkerError::Checkpoint)?;
        self.cache(player);
        let mut offset = 0;
        for part in &mut self.sources {
            let end = offset + part.len();
            part.copy_from_slice(&self.output[offset..end]);
            offset = end;
        }
        apply_glue(self.glue.connections(&player.model), &mut self.sources);
        self.output.clear();
        self.output.extend(self.sources.iter().flatten());
        self.active = false;
        Ok(())
    }
}
impl WorkerRuntime {
    pub fn geometry_layout(&mut self) -> &[f64] {
        if self.geometry_layout.is_empty()
            && let Some(player) = &self.player
        {
            self.geometry_layout = crate::geometry_frame::encode_layout(
                player.model.parts.iter().map(|part| part.rest.len()),
                &player.model.glue_connections,
            );
        }
        &self.geometry_layout
    }
    pub fn geometry_packet(&self, id: u32) -> Option<&[f64]> {
        self.geometry_frames
            .iter()
            .find(|slot| slot.id == id && slot.active)
            .map(|slot| slot.packet.as_slice())
    }
    pub fn cache_geometry(&mut self, id: u32, discard: bool) -> Result<(), WorkerError> {
        let slot = self
            .geometry_frames
            .iter_mut()
            .find(|slot| slot.id == id && slot.active)
            .ok_or_else(|| WorkerError::Checkpoint("Unknown geometry frame".into()))?;
        if !discard {
            slot.cache(self.player.as_mut().ok_or(WorkerError::Uninitialized)?);
        }
        slot.active = false;
        Ok(())
    }
    pub fn take_geometry(&mut self) -> Result<u32, WorkerError> {
        if !self.geometry_pending {
            return Err(WorkerError::Checkpoint("No pending geometry frame".into()));
        }
        let slot = match self.geometry_frames.iter().position(|slot| !slot.active) {
            Some(index) => index,
            None if self.geometry_frames.len() < 3 => {
                self.geometry_frames.push(GeometrySlot::default());
                self.geometry_frames.len() - 1
            }
            None => {
                return Err(WorkerError::Checkpoint(
                    "At most three geometry frames may be pending".into(),
                ));
            }
        };
        self.geometry_sequence = self.geometry_sequence.wrapping_add(1).max(1);
        let player = self.player.as_mut().ok_or(WorkerError::Uninitialized)?;
        self.geometry_frames[slot].capture(self.geometry_sequence, player, &mut self.vertices);
        self.geometry_pending = false;
        Ok(self.geometry_sequence)
    }
    pub fn geometry_output(&self, id: u32) -> Option<&[f32]> {
        self.geometry_frames
            .iter()
            .find(|slot| slot.id == id)
            .map(|slot| slot.output.as_slice())
    }
    pub fn geometry_input(&mut self, id: u32) -> Option<&mut [f32]> {
        self.geometry_frames
            .iter_mut()
            .find(|slot| slot.id == id && slot.active)
            .map(|slot| slot.output.as_mut_slice())
    }
    pub fn geometry_corrections(&mut self, id: u32, length: usize) -> Option<&mut [u32]> {
        let slot = self
            .geometry_frames
            .iter_mut()
            .find(|slot| slot.id == id && slot.active)?;
        slot.corrections.resize(length, 0);
        Some(&mut slot.corrections)
    }
    pub fn finish_geometry(&mut self, id: u32, all: bool) -> Result<(), WorkerError> {
        let slot = self
            .geometry_frames
            .iter_mut()
            .find(|slot| slot.id == id && slot.active)
            .ok_or_else(|| WorkerError::Checkpoint("Unknown geometry frame".into()))?;
        slot.finish(self.player.as_mut().ok_or(WorkerError::Uninitialized)?, all)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::Model;
    use poffo_format::{Document, ValidDocument};
    use serde_json::json;
    use std::sync::Arc;
    #[test]
    fn pending_frames_retain_keyed_glue_when_finished_out_of_order() {
        let parts:Vec<_>=[("first",0.0),("second",10.0)].map(|(id,x)|json!({"id":id,"texture":{"src":"x","width":1,"height":1},"mesh":{"vertices":[x,0,x+1.0,0,x,1],"uvs":[0,0,1,0,0,1],"indices":[0,1,2]}})).into();
        let document:Document=serde_json::from_value(json!({"format":"winter-love-poffo","version":1,"viewport":{"width":20,"height":2},"motions":[],"parts":parts,"parameters":[{"id":"p","name":"P","minimum":0,"maximum":1,"defaultValue":0}],"glue":[{"id":"join","first":{"partId":"first","vertexIndex":0},"second":{"partId":"second","vertexIndex":0},"weight":0.25,"strength":0.5}],"parameterBindings":[{"id":"binding","interpolation":"grid","parameterIds":["p"],"targetGlueIds":["join"],"keyforms":[{"values":[0],"parts":[],"glue":[{"id":"join","weight":0.25,"strength":0.5}]},{"values":[1],"parts":[],"glue":[{"id":"join","weight":1,"strength":1}]}]}]})).unwrap();
        let model = Arc::new(Model::new(ValidDocument::new(document).unwrap()));
        let mut player = Player::new(Arc::clone(&model));
        player.deferred = Some(DeferredGeometry::default());
        let mut frames = Vec::new();
        for (index, value) in [0.0, 1.0, 0.37].into_iter().enumerate() {
            assert!(player.set_parameter_value("p", value));
            player.update(0.0);
            let mut points: Vec<_> = player.frame.vertices.iter().flatten().copied().collect();
            let mut expected = player.frame.vertices.clone();
            apply_glue(
                [model.compose_glue_connection(0, &player.frame.parameter_values)],
                &mut expected,
            );
            let mut frame = GeometrySlot::default();
            frame.capture(index as u32 + 1, &mut player, &mut points);
            assert!(points.is_empty());
            frames.push((frame, expected.into_iter().flatten().collect::<Vec<_>>()));
        }
        for index in [2, 0, 1] {
            let (frame, expected) = &mut frames[index];
            frame.finish(&mut player, true).unwrap();
            assert_eq!(
                frame.output.iter().map(|v| v.to_bits()).collect::<Vec<_>>(),
                expected.iter().map(|v| v.to_bits()).collect::<Vec<_>>()
            );
        }
    }
}
