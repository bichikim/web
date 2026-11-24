//! Model activation for JSON messages and packed runtime sections.
use super::{WorkerError, WorkerReply, WorkerRuntime, frame};
use crate::{Model, Player};
use poffo_format::PoffoFile;
use serde_json::{Value, json};
use std::{collections::HashMap, sync::Arc};

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
            if let Some(index) = model.deformers.iter().position(|d| d.node.id == id) {
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

pub(super) fn coordinate_groups(document: &Value) -> Result<Vec<(String, usize)>, WorkerError> {
    fn visit(
        nodes: &Value,
        parent: usize,
        document: &Value,
        keys: &mut HashMap<String, usize>,
        groups: &mut Vec<(String, usize)>,
    ) -> Result<(), WorkerError> {
        for node in nodes.as_array().into_iter().flatten() {
            let mut next = parent;
            if node["kind"] == "deformer" {
                let id = node["id"].as_str().unwrap_or("");
                let excluded = [
                    "id",
                    "name",
                    "kind",
                    "visible",
                    "locked",
                    "children",
                    "properties",
                    "parameterVisibility",
                ];
                let shape = Value::Object(
                    node.as_object()
                        .into_iter()
                        .flatten()
                        .filter(|(k, _)| !excluded.contains(&k.as_str()))
                        .map(|(k, v)| (k.clone(), v.clone()))
                        .collect(),
                );
                let inputs = document["parameterBindings"]
                    .as_array()
                    .into_iter()
                    .flatten()
                    .filter(|b| {
                        b["targetDeformerIds"]
                            .as_array()
                            .is_some_and(|ids| ids.iter().any(|v| v == id))
                    })
                    .map(|b| {
                        let mut input = json!({});
                        for key in [
                            "parameterIds",
                            "influenceMode",
                            "influences",
                            "interpolation",
                            "keyformRange",
                            "sampling",
                        ] {
                            if let Some(value) = b.get(key) {
                                input[key] = value.clone();
                            }
                        }
                        input["keyforms"] = json!(
                            b["keyforms"]
                                .as_array()
                                .into_iter()
                                .flatten()
                                .map(|form| {
                                    let keyed = form["deformers"].as_array().and_then(|entries| {
                                        entries.iter().find(|d| d["nodeId"] == id)
                                    });
                                    let coordinates = keyed
                                        .map(|v| {
                                            Value::Object(
                                                v.as_object()
                                                    .into_iter()
                                                    .flatten()
                                                    .filter(|(key, _)| {
                                                        !["nodeId", "properties"]
                                                            .contains(&key.as_str())
                                                    })
                                                    .map(|(k, v)| (k.clone(), v.clone()))
                                                    .collect(),
                                            )
                                        })
                                        .unwrap_or_else(|| json!({}));
                                    json!({"values":form["values"],"coordinates":coordinates})
                                })
                                .collect::<Vec<_>>()
                        );
                        input
                    })
                    .collect::<Vec<_>>();
                let key = serde_json::to_string(&json!([parent, shape, inputs]))
                    .map_err(WorkerError::Json)?;
                let candidate = keys.len() + 1;
                next = *keys.entry(key).or_insert(candidate);
                groups.push((id.to_owned(), next));
            }
            visit(&node["children"], next, document, keys, groups)?;
        }
        Ok(())
    }
    let mut groups = Vec::new();
    visit(
        &document["scene"]["roots"],
        0,
        document,
        &mut HashMap::new(),
        &mut groups,
    )?;
    Ok(groups)
}
