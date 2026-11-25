//! Complete numerical playback Worker. Browser memory and message APIs stay in the host.
mod checkpoint;
mod frame;
mod geometry;
mod json;
mod model;
use crate::{Player, Sound};
use model::coordinate_groups;
use poffo_format::PoffoFile;
use serde::Serialize;
use serde_json::{Value, json};
use std::{collections::HashMap, sync::Arc};

#[derive(Serialize)]
#[serde(untagged)]
#[allow(
    clippy::large_enum_variant,
    reason = "Keep the frequently produced frame on the stack to avoid per-frame heap allocation."
)]
enum WorkerReply<'a> {
    Message(Value),
    Produced {
        id: Value,
        kind: &'static str,
        frame: ProducedFrame<'a>,
    },
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct ProducedFrame<'a> {
    kind: &'static str,
    generation: u64,
    input_revision: u64,
    time: Value,
    delta_time: Value,
    playback: Value,
    computed: ComputedFrame,
    state: &'a Value,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct ComputedFrame {
    frame: Value,
    parameter_values: Value,
}

#[derive(Debug, thiserror::Error)]
pub enum WorkerError {
    #[error("Invalid playback message: {0}")]
    Json(#[source] serde_json::Error),
    #[error("Invalid playback document: {0:?}")]
    Document(#[source] poffo_format::FormatError),
    #[error("Invalid playback checkpoint: {0}")]
    Checkpoint(String),
    #[error("A playback Worker must be initialized")]
    Uninitialized,
    #[error("Unknown playback Worker message")]
    Message,
}
pub(crate) fn undefined() -> Value {
    json!({"__poffoUndefined":true})
}
pub(crate) fn map(entries: Vec<Value>) -> Value {
    Value::Object(
        [("__poffoMap".to_owned(), Value::Array(entries))]
            .into_iter()
            .collect(),
    )
}
pub(crate) fn pairs(value: &Value) -> Vec<&Value> {
    value["__poffoMap"]
        .as_array()
        .into_iter()
        .flatten()
        .collect()
}
#[derive(Default)]
pub struct WorkerRuntime {
    player: Option<Player>,
    audio: HashMap<String, Arc<Sound>>,
    generation: u64,
    revision: u64,
    vertices: Vec<f32>,
    packed: frame::FrameEncoder,
    geometry_frames: Vec<geometry::GeometrySlot>,
    geometry_sequence: u32,
    geometry_pending: bool,
    geometry_layout: Vec<f64>,
    checkpoint_id: Option<u64>,
}
impl WorkerRuntime {
    /// Latest computed scene for a renderer sharing this runtime's memory.
    pub fn frame(&self) -> Option<&crate::Frame> {
        self.player.as_ref().map(|player| &player.frame)
    }
    pub fn vertices(&self) -> &[f32] {
        &self.vertices
    }
    pub fn geometry_commands(&self) -> &[u32] {
        self.player
            .as_ref()
            .and_then(|p| p.deferred.as_ref())
            .map_or(&[], |g| g.commands.as_slice())
    }
    pub fn geometry_values(&self) -> &[f32] {
        self.player
            .as_ref()
            .and_then(|p| p.deferred.as_ref())
            .map_or(&[], |g| g.values.as_slice())
    }
    pub fn geometry_pending(&self) -> bool {
        self.geometry_pending
    }
    pub fn part_values(&self) -> &[f64] {
        &self.packed.part_values
    }
    pub fn layer_values(&self) -> &[f64] {
        &self.packed.layer_values
    }
    fn patch_audio(&mut self, sounds: &Value, removed: &Value) -> Result<(), WorkerError> {
        for src in removed
            .as_array()
            .into_iter()
            .flatten()
            .filter_map(Value::as_str)
        {
            self.audio.remove(src);
        }
        for entry in pairs(sounds) {
            let sound = &entry[1];
            let samples = |value: &Value| {
                value
                    .as_array()
                    .into_iter()
                    .flatten()
                    .map(|v| {
                        v.as_f64()
                            .map(|n| n as f32)
                            .ok_or_else(|| WorkerError::Checkpoint("Invalid sound sample".into()))
                    })
                    .collect::<Result<Vec<_>, _>>()
            };
            let sound = Sound {
                sample_rate: sound["sampleRate"].as_u64().unwrap_or(0) as u32,
                mono: samples(&sound["mono"])?,
                channels: sound["channels"]
                    .as_array()
                    .into_iter()
                    .flatten()
                    .map(samples)
                    .collect::<Result<_, _>>()?,
            };
            if sound.sample_rate == 0 {
                return Err(WorkerError::Checkpoint("Invalid sample rate".into()));
            }
            self.audio
                .insert(entry[0].as_str().unwrap_or("").to_owned(), Arc::new(sound));
        }
        if let Some(player) = &mut self.player {
            for (i, motion) in player.model.document.motions.iter().enumerate() {
                player.motion_sounds[i] = motion
                    .sound
                    .as_ref()
                    .and_then(|s| self.audio.get(&s.src))
                    .cloned();
            }
        }
        Ok(())
    }
    fn process(
        &mut self,
        message: &mut Value,
        packed: bool,
    ) -> Result<WorkerReply<'_>, WorkerError> {
        let id = message["id"].clone();
        match message["kind"].as_str() {
            Some("initialize") => {
                if self.geometry_frames.iter().any(|frame| frame.active) {
                    return Err(WorkerError::Checkpoint(
                        "Geometry frames must finish before reinitialization".into(),
                    ));
                }
                let mut doc = message["document"].take();
                let coordinates = coordinate_groups(&doc)?;
                if let Some(parts) = doc["parts"].as_array_mut() {
                    for part in parts {
                        part["texture"]["src"] = json!("__host_texture__");
                    }
                }
                if let Some(object) = doc.as_object_mut() {
                    object.remove("textureAssets");
                }
                let document = PoffoFile::from_value(doc)
                    .into_document()
                    .map_err(WorkerError::Document)?;
                self.initialize_model(
                    document,
                    coordinates,
                    message["deferGeometry"] == true,
                    &message["audio"],
                    id,
                )
            }
            Some("audio") => {
                if self.player.is_none() {
                    return Err(WorkerError::Uninitialized);
                }
                self.patch_audio(&message["sounds"], &message["removed"])?;
                Ok(WorkerReply::Message(json!({"id":id,"kind":"audio"})))
            }
            Some("reset") => {
                self.reset_checkpoint(message)?;
                Ok(WorkerReply::Message(json!({"id":id,"kind":"reset"})))
            }
            Some("produce") => {
                if self.geometry_pending {
                    return Err(WorkerError::Checkpoint(
                        "The previous geometry frame is unfinished".into(),
                    ));
                }
                let request = &mut message["request"];
                let player = self.player.as_mut().ok_or(WorkerError::Uninitialized)?;
                if request["generation"].as_u64() != Some(self.generation) {
                    return Ok(WorkerReply::Message(
                        json!({"id":id,"kind":"produced","frame":{"kind":"stale","generation":request["generation"]}}),
                    ));
                }
                player.render_geometry_only =
                    request["renderGeometryOnly"] == true && player.model.layers.is_empty();
                checkpoint::restore_frame_input(
                    player,
                    self.checkpoint_id,
                    &mut self.revision,
                    &mut request["input"],
                )?;
                let completed = player.update(request["deltaTime"].as_f64().unwrap_or(0.0));
                self.geometry_pending = player.deferred.as_ref().is_some_and(|batch| batch.pending);
                player.update_worker_state(
                    &completed,
                    request["acknowledgedNotices"].as_u64().unwrap_or(0),
                )?;
                self.vertices.clear();
                self.vertices
                    .reserve(player.frame.vertices.iter().map(Vec::len).sum());
                for part in &player.frame.vertices {
                    self.vertices.extend_from_slice(part);
                }
                let values = Value::Object(
                    player
                        .model
                        .document
                        .parameters
                        .iter()
                        .zip(&player.frame.parameter_values)
                        .map(|(p, v)| (p.id.clone(), json!(v)))
                        .collect(),
                );
                let frame = if packed {
                    self.packed.encode(player)
                } else {
                    player.worker_frame()
                };
                self.checkpoint_id = id.as_u64();
                Ok(WorkerReply::Produced {
                    id,
                    kind: "produced",
                    frame: ProducedFrame {
                        kind: "frame",
                        generation: self.generation,
                        input_revision: self.revision,
                        time: request["time"].take(),
                        delta_time: request["deltaTime"].take(),
                        playback: player.worker_playback(),
                        computed: ComputedFrame {
                            frame,
                            parameter_values: values,
                        },
                        state: &player.worker_state,
                    },
                })
            }
            _ => Err(WorkerError::Message),
        }
    }
}
