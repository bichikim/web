//! Complete numerical playback Worker. Browser memory and message APIs stay in the host.
use crate::{Completions, MaskPlan, Model, Player, Sound};
use poffo_format::PoffoFile;
use serde_json::{Value, json};
use std::{collections::HashMap, sync::Arc};

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
    json!({"__poffoMap":entries})
}
pub(crate) fn pairs(value: &Value) -> Vec<&Value> {
    value["__poffoMap"]
        .as_array()
        .into_iter()
        .flatten()
        .collect()
}
fn normalize(value: &mut Value, arrays: &[Vec<f64>]) {
    match value {
        Value::Array(items) => items.iter_mut().for_each(|v| normalize(v, arrays)),
        Value::Object(object) => {
            if object.get("__poffoUndefined") == Some(&Value::Bool(true)) {
                *value = Value::Null;
            } else if object.get("__poffoNumber").and_then(Value::as_str) == Some("-0") {
                *value = json!(-0.0);
            } else if let Some(typed) = object.remove("__poffoTyped") {
                *value = typed;
            } else if let Some(index) = object.get("__poffoArray").and_then(Value::as_u64) {
                *value = Value::Array(
                    arrays
                        .get(index as usize)
                        .into_iter()
                        .flatten()
                        .map(|v| json!(v))
                        .collect(),
                );
            } else {
                object.values_mut().for_each(|v| normalize(v, arrays));
            }
        }
        _ => {}
    }
}
fn enum_name(value: impl std::fmt::Debug) -> String {
    let text = format!("{value:?}");
    let mut result = String::new();
    for (i, c) in text.chars().enumerate() {
        if c.is_uppercase() && i > 0 {
            result.push('-');
        }
        result.extend(c.to_lowercase());
    }
    result
}
fn mask(value: &MaskPlan, model: &Model) -> Value {
    json!({"sources":value.sources.iter().map(|s| {
        let mut value=json!({"partId":model.document.parts[s.part].id,"invertedMask":s.inverted_mask});
        if let Some(nested)=&s.mask {value["mask"]=mask(nested,model);}value
    }).collect::<Vec<_>>()})
}
impl Player {
    pub(crate) fn worker_frame(&self) -> Value {
        let layers = &self.frame.layers;
        let model = &self.model;
        let layer_ids = |indices: &[usize]| {
            indices
                .iter()
                .map(|&i| layers[i].id.clone())
                .collect::<Vec<_>>()
        };
        let parts=self.frame.plans.iter().map(|plan| {
            let p=&plan.properties;
            let clipping=model.document.parts[plan.part].properties.as_ref().and_then(|p|p.clipping_mask_ids.as_ref()).cloned().unwrap_or_default();
            let mut v=json!({"partId":model.document.parts[plan.part].id,"layerIds":layer_ids(&plan.layers),"render":plan.render,"visible":plan.visible,"properties":{"alphaBlendMode":enum_name(p.alpha_blend_mode),"blendMode":enum_name(p.blend_mode),"clippingMaskIds":clipping,"culling":p.culling,"invertedMask":p.inverted_mask,"multiplyColor":p.multiply_color,"opacity":p.opacity,"renderWhenUsedAsMask":p.render_when_used_as_mask,"screenColor":p.screen_color}});
            if let Some(m)=&plan.mask {v["mask"]=mask(m,model);}v
        }).collect::<Vec<_>>();
        let layers=layers.iter().map(|plan| {
            let p=&plan.properties;
            let clipping=model.group_ids.iter().position(|id|id==&plan.id).map(|i|model.groups[i].properties.clipping_mask_ids.clone()).unwrap_or_default();
            let mut v=json!({"groupId":plan.id,"layerIds":layer_ids(&plan.layers),"visible":plan.visible,"properties":{"alphaBlendMode":enum_name(p.alpha_blend_mode),"blendMode":enum_name(p.blend_mode),"clippingMaskIds":clipping,"invertedMask":p.inverted_mask,"multiplyColor":p.effect.multiply_color,"opacity":p.effect.opacity,"screenColor":p.effect.screen_color}});
            if let Some(m)=&plan.mask {v["mask"]=mask(m,model);}json!([plan.id,v])
        }).collect::<Vec<_>>();
        let mut spatial = self.frame.spatial_poses.iter().collect::<Vec<_>>();
        spatial.sort_by_key(|(i, _)| **i);
        let spatial=spatial.into_iter().map(|(&i,p)|json!([model.document.parts[i].id,{"vertices":p.vertices,"depths":p.depths,"depth":p.depth,"facing":p.facing}])).collect();
        json!({"layers":map(layers),"plans":parts,"spatialPoses":map(spatial)})
    }
    fn initial_worker(&mut self) -> Result<(), WorkerError> {
        self.worker_state = json!({"additional":[],"notices":{"pending":[],"sequence":0},"adjustments":{"blends":{"before-physics":map(vec![]),"after-physics":map(vec![])},"physicsOptions":undefined()},"parameterValues":{},"renderOverrides":{"parts":map(vec![]),"groups":map(vec![])},"modelOpacity":1,"physicsPreview":true,"eyeBlinkTiming":serde_json::to_value(crate::EyeBlinkTiming::default()).map_err(WorkerError::Json)?,"lipSyncLevel":undefined(),"voiceTarget":undefined(),"playback":{"completion":undefined()},"history":{"frames":[],"base":{},"values":{}}});
        self.capture_worker(&Completions::default(), 0)?;
        Ok(())
    }
}
#[derive(Default)]
pub struct WorkerRuntime {
    player: Option<Player>,
    audio: HashMap<String, Arc<Sound>>,
    generation: u64,
    revision: u64,
    vertices: Vec<f32>,
}
impl WorkerRuntime {
    pub fn vertices(&self) -> &[f32] {
        &self.vertices
    }
    pub fn process_json(&mut self, bytes: &[u8], arrays: &[Vec<f64>]) -> Vec<u8> {
        let result = serde_json::from_slice::<Value>(bytes)
            .map_err(WorkerError::Json)
            .map(|mut message| {
                normalize(&mut message, arrays);
                let id = message["id"].clone();
                self.process(&mut message).unwrap_or_else(
                    |error| json!({"id":id,"kind":"error","message":error.to_string()}),
                )
            });
        // Serializing JSON values cannot fail except for an invalid serializer implementation.
        serde_json::to_vec(
            &result
                .unwrap_or_else(|error| json!({"kind":"error","id":0,"message":error.to_string()})),
        )
        .unwrap_or_default()
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
    fn process(&mut self, message: &mut Value) -> Result<Value, WorkerError> {
        let id = message["id"].clone();
        match message["kind"].as_str() {
            Some("initialize") => {
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
                let mut model = Model::new(
                    PoffoFile::from_value(doc)
                        .into_document()
                        .map_err(WorkerError::Document)?,
                );
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
                self.player = Some(player);
                self.audio.clear();
                self.patch_audio(&message["audio"], &json!([]))?;
                self.vertices.resize(bytes / 4, 0.0);
                self.generation = 0;
                self.revision = 0;
                Ok(json!({"id":id,"kind":"initialized","bytes":bytes}))
            }
            Some("audio") => {
                if self.player.is_none() {
                    return Err(WorkerError::Uninitialized);
                }
                self.patch_audio(&message["sounds"], &message["removed"])?;
                Ok(json!({"id":id,"kind":"audio"}))
            }
            Some("reset") => {
                self.player
                    .as_mut()
                    .ok_or(WorkerError::Uninitialized)?
                    .restore_worker(message["state"].clone())?;
                self.generation = message["generation"].as_u64().unwrap_or(0);
                self.revision = message["inputRevision"].as_u64().unwrap_or(0);
                Ok(json!({"id":id,"kind":"reset"}))
            }
            Some("produce") => {
                let request = &message["request"];
                let player = self.player.as_mut().ok_or(WorkerError::Uninitialized)?;
                if request["generation"].as_u64() != Some(self.generation) {
                    return Ok(
                        json!({"id":id,"kind":"produced","frame":{"kind":"stale","generation":request["generation"]}}),
                    );
                }
                let input = &request["input"];
                if !input.is_null() {
                    player.restore_worker(input["state"].clone())?;
                    self.revision = input["revision"].as_u64().unwrap_or(0);
                    if input["settle"] == true {
                        player.settle_worker();
                    }
                }
                let completed = player.update(request["deltaTime"].as_f64().unwrap_or(0.0));
                let state = player.capture_worker(
                    &completed,
                    request["acknowledgedNotices"].as_u64().unwrap_or(0),
                )?;
                self.vertices.clear();
                self.vertices.extend(player.frame.vertices.iter().flatten());
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
                Ok(
                    json!({"id":id,"kind":"produced","frame":{"kind":"frame","generation":self.generation,"inputRevision":self.revision,"time":request["time"],"deltaTime":request["deltaTime"],"playback":player.worker_playback(),"computed":{"frame":player.worker_frame(),"parameterValues":values},"state":state}}),
                )
            }
            _ => Err(WorkerError::Message),
        }
    }
}

fn coordinate_groups(document: &Value) -> Result<Vec<(String, usize)>, WorkerError> {
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
