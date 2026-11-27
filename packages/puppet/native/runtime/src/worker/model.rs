//! Model activation for JSON messages and packed runtime sections.
use super::{WorkerError, WorkerReply, WorkerRuntime, coordinate_groups::coordinate_groups, frame};
use crate::{Model, Player};
use poffo_format::PoffoFile;
use serde_json::{Value, json};
use std::sync::Arc;

impl WorkerRuntime {
    pub fn write_runtime_section(
        &mut self,
        source: &[u8],
        id: u32,
        defer: bool,
        output: &mut Vec<u8>,
    ) {
        let response = PoffoFile::from_runtime_section(source)
            .map_err(WorkerError::Document)
            .and_then(|file| {
                let coordinates = coordinate_groups(file.structure())?;
                let document = file.into_document().map_err(WorkerError::Document)?;
                self.initialize_model(document, coordinates, defer, &Value::Null, json!(id))
            })
            .unwrap_or_else(|error| {
                WorkerReply::Message(json!({"id":id,"kind":"error","message":error.to_string()}))
            });
        output.clear();
        if serde_json::to_writer(&mut *output, &response).is_err() {
            output.clear();
        }
    }

    pub(super) fn initialize_model(
        &mut self,
        document: poffo_format::ValidDocument,
        coordinates: Vec<(String, usize)>,
        defer: bool,
        sounds: &Value,
        id: Value,
    ) -> Result<WorkerReply<'_>, WorkerError> {
        let mut model = Model::new(document);
        for (id, group) in coordinates {
            if let Some(&index) = model.deformer_index.get(&id) {
                model.coordinate_ids[index] = group;
            }
        }
        let bytes = model
            .document
            .parts
            .iter()
            .map(|p| p.mesh.vertices.len() * 4)
            .sum::<usize>();
        let mut player = Player::new(Arc::new(model));
        player.initial_worker()?;
        if defer {
            player.deferred = Some(crate::deferred::DeferredGeometry::default());
        }
        self.player = Some(player);
        self.packed = frame::FrameEncoder::default();
        self.audio.clear();
        self.patch_audio(sounds, &json!([]))?;
        self.vertices.resize(bytes / 4, 0.0);
        self.generation = 0;
        self.revision = 0;
        self.geometry_pending = false;
        self.geometry_layout.clear();
        self.checkpoint_id = None;
        Ok(WorkerReply::Message(
            json!({"id":id,"kind":"initialized","bytes":bytes}),
        ))
    }
}
