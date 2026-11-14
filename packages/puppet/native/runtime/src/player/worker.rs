//! Translation of the web player's checkpoint at the Worker I/O boundary.
use super::*;
use crate::worker::{WorkerError, map, pairs, undefined};
use serde::{Serialize, de::DeserializeOwned};
use serde_json::{Value, json};

fn read<T: DeserializeOwned>(value: Value) -> Result<T, WorkerError> {
    serde_json::from_value(value).map_err(WorkerError::Json)
}
fn write<T: Serialize>(value: &T) -> Result<Value, WorkerError> {
    serde_json::to_value(value).map_err(WorkerError::Json)
}
fn number(v: &Value, key: &str, default: f64) -> f64 {
    v[key].as_f64().unwrap_or(default)
}
fn title(s: &str) -> String {
    let mut chars = s.chars();
    chars.next().map_or_else(String::new, |c| {
        c.to_uppercase().collect::<String>() + chars.as_str()
    })
}
fn cursor(v: &Value) -> Value {
    json!({"looped":v["loop"],"speed":v["speed"],"time":v["time"],"elapsed":v["elapsed"]})
}
fn vector(v: &Value) -> Value {
    json!({"x":v[0],"y":v[1]})
}
fn point(v: &Value) -> Value {
    json!([v["x"], v["y"]])
}
fn vowels(v: &Value) -> Value {
    if v.is_null() {
        Value::Null
    } else {
        json!([v["a"], v["i"], v["u"], v["e"], v["o"]])
    }
}
fn web_vowels(v: &Value) -> Value {
    if v.is_null() {
        undefined()
    } else {
        json!({"a":v[0],"i":v[1],"u":v[2],"e":v[3],"o":v[4]})
    }
}
fn optional(v: &Value) -> Value {
    if v.is_null() { undefined() } else { v.clone() }
}
fn web_cursor(target: &mut Value, c: &Value) {
    for key in ["speed", "time"] {
        target[key] = c[key].clone();
    }
    target["loop"] = c["looped"].clone();
    target["elapsed"] = optional(&c["elapsed"]);
}

impl Player {
    fn motion_index(&self, id: &Value) -> Result<usize, WorkerError> {
        self.model
            .document
            .motions
            .iter()
            .position(|m| Some(m.id.as_str()) == id.as_str())
            .ok_or_else(|| WorkerError::Checkpoint("Unknown motion".into()))
    }
    fn expressions_from_web(&self, entries: &Value) -> Result<ExpressionPlayback, WorkerError> {
        let entries = entries.as_array().into_iter().flatten().map(|v| {
            let index = self.model.document.expressions.iter().position(|e| Some(e.id.as_str()) == v["expressionId"].as_str())
                .ok_or_else(|| WorkerError::Checkpoint("Unknown expression".into()))?;
            let cubism = self.model.document.expressions[index].composition == Some(poffo_format::document::ExpressionComposition::Cubism);
            Ok(json!({"expression":index,"cubism":cubism,"fading":title(v["fading"].as_str().unwrap_or("in")),"progress":v["progress"],"release":v["release"],"stack":v["mode"]=="stack"}))
        }).collect::<Result<Vec<_>,WorkerError>>()?;
        read(json!({"entries":entries}))
    }
    fn web_expressions(&self, playback: &ExpressionPlayback) -> Result<Value, WorkerError> {
        let value = write(playback)?;
        Ok(Value::Array(value["entries"].as_array().into_iter().flatten().map(|v| {
            let id = &self.model.document.expressions[v["expression"].as_u64().unwrap_or(0) as usize].id;
            let mut entry = json!({"expressionId":id,"fading":v["fading"].as_str().unwrap_or("").to_lowercase(),"progress":v["progress"],"release":optional(&v["release"])});
            if v["stack"] == true { entry["mode"] = json!("stack"); }
            entry
        }).collect()))
    }
    fn parameter_record(&self, values: &[f64]) -> Value {
        Value::Object(
            self.model
                .document
                .parameters
                .iter()
                .zip(values)
                .map(|(p, &v)| (p.id.clone(), json!(v)))
                .collect(),
        )
    }
    fn parameter_vector(&self, values: &Value) -> Vec<f64> {
        self.model
            .document
            .parameters
            .iter()
            .map(|p| values[&p.id].as_f64().unwrap_or(p.default_value))
            .collect()
    }
    pub(crate) fn restore_worker(&mut self, state: Value) -> Result<(), WorkerError> {
        let mut selected = state["playback"].clone();
        let outgoing = selected["outgoing"].as_array().into_iter().flatten().map(|v| {
            Ok(json!({"motion":self.motion_index(&v["motionId"])? ,"cursor":cursor(v),"remaining":v["remaining"]}))
        }).collect::<Result<Vec<_>,WorkerError>>()?;
        selected["motion"] = if selected["motionId"].is_null() {
            Value::Null
        } else {
            json!(self.motion_index(&selected["motionId"])?)
        };
        selected["cursor"] = cursor(&selected);
        selected["status"] = json!(title(selected["status"].as_str().unwrap_or("stopped")));
        selected["outgoing"] = json!(outgoing);
        self.selected = read(selected)?;
        let entries = state["additional"].as_array().into_iter().flatten().map(|v| {
            Ok(json!([v["id"],{"motion":self.motion_index(&v["motionId"])? ,"cursor":cursor(v),"blend":title(v["blend"].as_str().unwrap_or("replace")),"priority":v["priority"],"weight":v["weight"],"status":title(v["status"].as_str().unwrap_or("playing")),"stopping":v["stopping"]}]))
        }).collect::<Result<Vec<_>,WorkerError>>()?;
        self.playbacks = read(
            json!({"next_handle":state["additional"].as_array().into_iter().flatten().filter_map(|v|v["id"].as_u64()).max().unwrap_or(0),"entries":entries}),
        )?;
        self.expressions = self.expressions_from_web(&state["expressions"])?;
        self.expression_layers = state["expressionLayers"]
            .as_array()
            .into_iter()
            .flatten()
            .map(|v| {
                Ok((
                    v["id"].as_str().unwrap_or("").to_owned(),
                    self.expressions_from_web(&v["entries"])?,
                ))
            })
            .collect::<Result<_, WorkerError>>()?;
        self.random = read(json!({"state":state["randomState"]}))?;
        self.eye_blink_timing = read(state["eyeBlinkTiming"].clone())?;
        let eye = &state["eyeBlink"];
        self.eye_blink = if eye.is_null() {
            None
        } else {
            let phase = title(eye["phase"].as_str().unwrap_or("open"));
            let data = if phase == "Open" {
                json!({"next":eye["next"]})
            } else {
                json!({"since":eye["since"]})
            };
            Some(read(json!({"time":eye["time"],"phase":{phase:data}}))?)
        };
        self.look_and_breath = read(
            json!({"breath":state["look"]["breathTime"],"target":[state["look"]["lookTarget"]["x"],state["look"]["lookTarget"]["y"]],"point":state["look"]["lookPoint"]}),
        )?;
        self.lip_sync = state["lipSyncLevel"].as_f64();
        self.voice_target = read(vowels(&state["voiceTarget"]))?;
        self.mouth = if state["mouth"].is_null() {
            None
        } else {
            Some(read(
                json!({"shown":vowels(&state["mouth"]["shown"]),"target":vowels(&state["mouth"]["target"])}),
            )?)
        };
        self.model_opacity = number(&state, "modelOpacity", 1.0);
        self.physics_preview = state["physicsPreview"].as_bool().unwrap_or(true);
        self.overrides = self
            .model
            .document
            .parameters
            .iter()
            .map(|p| {
                state["parameterValues"]
                    .get(&p.id)
                    .map(|v| v.as_f64().unwrap_or(p.default_value))
            })
            .collect();
        for stage in ["before-physics", "after-physics"] {
            let entries = pairs(&state["adjustments"]["blends"][stage]);
            let blends = self
                .model
                .document
                .parameters
                .iter()
                .map(|p| {
                    entries
                        .iter()
                        .find(|v| v[0] == p.id)
                        .map(|v| {
                            let mut blend = v[1].clone();
                            blend["mode"] =
                                json!(title(blend["mode"].as_str().unwrap_or("overwrite")));
                            read(blend)
                        })
                        .transpose()
                })
                .collect::<Result<Vec<Option<ParameterBlend>>, WorkerError>>()?;
            if stage == "before-physics" {
                self.parameter_blends = blends;
            } else {
                self.after_physics_blends = blends;
            }
        }
        self.physics_options = if state["adjustments"]["physicsOptions"].is_null() {
            PhysicsOptions::default()
        } else {
            read(state["adjustments"]["physicsOptions"].clone())?
        };
        let pendulums = pairs(&state["physicsState"]);
        self.physics = self
            .model
            .document
            .physics
            .iter()
            .flat_map(|p| &p.pendulums)
            .map(|p| {
                pendulums
                    .iter()
                    .find(|v| v[0] == p.id)
                    .map_or(Ok(PendulumState::default()), |v| read(v[1].clone()))
            })
            .collect::<Result<_, _>>()?;
        self.chains = if state["chainState"].is_null() {
            None
        } else {
            let c = &state["chainState"];
            let entries = pairs(&c["chains"]);
            let chains = self
                .model
                .document
                .physics
                .iter()
                .flat_map(|p| &p.chains)
                .map(|p| {
                    let mut chain = entries
                        .iter()
                        .find(|v| v[0] == p.id)
                        .map(|v| v[1].clone())
                        .ok_or_else(|| WorkerError::Checkpoint("Missing physics chain".into()))?;
                    chain["root"] = vector(&chain["root"]);
                    if let Some(pendulums) = chain["pendulums"].as_array_mut() {
                        for p in pendulums {
                            for key in ["gravity", "position", "velocity"] {
                                p[key] = vector(&p[key]);
                            }
                        }
                    }
                    Ok(chain)
                })
                .collect::<Result<Vec<_>, WorkerError>>()?;
            Some(read(
                json!({"accumulator":c["accumulator"],"inputs":self.parameter_vector(&c["inputs"]),"chains":chains}),
            )?)
        };
        let pose = pairs(&state["poseState"]);
        let groups = &self.model.document.pose_groups.as_slice();
        self.pose = if pose.is_empty() {
            None
        } else {
            Some(
                groups
                    .iter()
                    .map(|g| {
                        let entry = pose
                            .iter()
                            .find(|v| v[0] == g.id)
                            .ok_or_else(|| WorkerError::Checkpoint("Missing pose group".into()))?;
                        read(entry[1].clone())
                    })
                    .collect::<Result<_, WorkerError>>()?,
            )
        };
        let mut render = RenderOverrides::default();
        for kind in ["groups", "parts"] {
            for entry in pairs(&state["renderOverrides"][kind]) {
                let id = entry[0].as_str().unwrap_or("");
                let index = if kind == "parts" {
                    self.model.part_index(id)
                } else {
                    self.model.group_ids.iter().position(|s| s == id)
                };
                if let Some(index) = index {
                    let v = &entry[1];
                    let value = read(
                        json!({"culling":v["culling"],"multiply_color":v["multiplyColor"],"opacity":v["opacity"],"screen_color":v["screenColor"]}),
                    )?;
                    if kind == "parts" {
                        render.parts.insert(index, value);
                    } else {
                        render.groups.insert(index, value);
                    }
                }
            }
        }
        self.render_overrides = render;
        self.motion_values = self.parameter_vector(&state["history"]["values"]);
        self.motion_base = self.parameter_vector(&state["history"]["base"]);
        self.motion_frames = state["history"]["frames"]
            .as_array()
            .into_iter()
            .flatten()
            .map(|f| {
                Ok((
                    self.motion_index(&f["motionId"])?,
                    number(f, "time", 0.0),
                    f["elapsed"].as_f64(),
                    f["remaining"].as_f64(),
                ))
            })
            .collect::<Result<_, WorkerError>>()?;
        self.frame.resolved_values = self.parameter_vector(&state["frameValues"]);
        self.worker_state = state;
        self.dirty = false;
        Ok(())
    }
    pub(crate) fn settle_worker(&mut self) {
        self.apply_frame(0.0, true);
    }
    pub(crate) fn worker_playback(&self) -> Value {
        let motion = self
            .selected
            .motion
            .and_then(|i| self.model.document.motions.get(i));
        json!({"duration":motion.map_or(0.0,|m|m.duration),"motionId":motion.map(|m|&m.id),"time":self.selected.cursor.time})
    }
    pub(crate) fn capture_worker(
        &mut self,
        completed: &Completions,
        acknowledged: u64,
    ) -> Result<Value, WorkerError> {
        let mut state = self.worker_state.clone();
        let selected = write(&self.selected)?;
        let mut playback = state["playback"].clone();
        web_cursor(&mut playback, &selected["cursor"]);
        playback["status"] = json!(selected["status"].as_str().unwrap_or("").to_lowercase());
        for key in ["held", "scrubbed"] {
            playback[key] = selected[key].clone();
        }
        playback["motionId"] = self
            .selected
            .motion
            .map_or_else(undefined, |i| json!(self.model.document.motions[i].id));
        playback["outgoing"]=json!(selected["outgoing"].as_array().into_iter().flatten().map(|v| {
            let mut out=json!({"motionId":self.model.document.motions[v["motion"].as_u64().unwrap_or(0) as usize].id,"remaining":v["remaining"]});web_cursor(&mut out,&v["cursor"]);out
        }).collect::<Vec<_>>());
        let additional = write(&self.playbacks)?;
        let mut entries = Vec::new();
        for pair in additional["entries"].as_array().into_iter().flatten() {
            let v = &pair[1];
            let id = &pair[0];
            let mut entry = state["additional"]
                .as_array()
                .into_iter()
                .flatten()
                .find(|v| v["id"] == *id)
                .cloned()
                .unwrap_or_else(|| json!({}));
            entry["id"] = id.clone();
            entry["motionId"] =
                json!(self.model.document.motions[v["motion"].as_u64().unwrap_or(0) as usize].id);
            web_cursor(&mut entry, &v["cursor"]);
            for key in ["weight", "priority"] {
                entry[key] = v[key].clone();
            }
            entry["stopping"] = optional(&v["stopping"]);
            entry["blend"] = json!(v["blend"].as_str().unwrap_or("").to_lowercase());
            entry["status"] = json!(v["status"].as_str().unwrap_or("").to_lowercase());
            entries.push(entry);
        }
        let mut pending = state["notices"]["pending"]
            .as_array()
            .cloned()
            .unwrap_or_default();
        pending.retain(|n| n["sequence"].as_u64().unwrap_or(0) > acknowledged);
        let mut sequence = state["notices"]["sequence"].as_u64().unwrap_or(0);
        let mut emit = |mut value: Value| {
            sequence += 1;
            value["sequence"] = json!(sequence);
            pending.push(value);
        };
        for event in &completed.selected_events {
            emit(
                json!({"kind":"event","event":{"motionId":self.model.document.motions[event.motion].id,"time":event.time,"value":event.value}}),
            );
        }
        if completed.selected {
            if let Some(token) = playback["completion"].as_u64() {
                emit(json!({"kind":"completion","completion":token}));
            }
            playback["completion"] = undefined();
        }
        for notice in &completed.independent_notices {
            match notice {
                crate::playback::PlaybackNotice::Event(event) => emit(
                    json!({"kind":"event","event":{"motionId":self.model.document.motions[event.motion].id,"time":event.time,"value":event.value}}),
                ),
                crate::playback::PlaybackNotice::Completion(handle) => {
                    if let Some(entry) = entries.iter().find(|v| v["id"].as_u64() == Some(handle.0))
                        && let Some(token) = entry["completion"].as_u64()
                    {
                        emit(json!({"kind":"completion","completion":token}));
                    }
                }
            }
        }
        state["notices"] = json!({"pending":pending,"sequence":sequence});
        state["playback"] = playback;
        state["additional"] = json!(entries);
        state["expressions"] = self.web_expressions(&self.expressions)?;
        state["expressionLayers"] = json!(
            self.expression_layers
                .iter()
                .map(|(id, p)| Ok(json!({"id":id,"entries":self.web_expressions(p)?})))
                .collect::<Result<Vec<_>, WorkerError>>()?
        );
        state["randomState"] = write(&self.random)?["state"].clone();
        state["frameValues"] = self.parameter_record(&self.frame.resolved_values);
        let look = write(&self.look_and_breath)?;
        state["look"] = json!({"breathTime":optional(&look["breath"]),"lookPoint":look["point"],"lookTarget":{"x":look["target"][0],"y":look["target"][1]}});
        state["mouth"] = if let Some(m) = self.mouth {
            let v = write(&m)?;
            json!({"shown":web_vowels(&v["shown"]),"target":web_vowels(&v["target"])})
        } else {
            undefined()
        };
        state["eyeBlink"] = if let Some(eye) = self.eye_blink {
            let v = write(&eye)?;
            let (phase, data) = v["phase"]
                .as_object()
                .and_then(|o| o.iter().next())
                .ok_or_else(|| WorkerError::Checkpoint("Invalid eye blink phase".into()))?;
            let mut out = data.clone();
            out["phase"] = json!(phase.to_lowercase());
            out["time"] = v["time"].clone();
            out
        } else {
            undefined()
        };
        state["physicsState"] = map(self
            .model
            .document
            .physics
            .iter()
            .flat_map(|p| &p.pendulums)
            .zip(&self.physics)
            .map(|(p, s)| Ok(json!([p.id, write(s)?])))
            .collect::<Result<Vec<_>, WorkerError>>()?);
        state["poseState"] = map(self
            .model
            .document
            .pose_groups
            .iter()
            .zip(self.pose.as_ref().into_iter().flatten())
            .map(|(p, s)| Ok(json!([p.id, write(s)?])))
            .collect::<Result<Vec<_>, WorkerError>>()?);
        state["chainState"] = if let Some(chains) = &self.chains {
            let v = write(chains)?;
            let chains = self
                .model
                .document
                .physics
                .iter()
                .flat_map(|p| &p.chains)
                .zip(v["chains"].as_array().into_iter().flatten())
                .map(|(p, c)| {
                    let mut c = c.clone();
                    c["root"] = point(&c["root"]);
                    if let Some(items) = c["pendulums"].as_array_mut() {
                        for p in items {
                            for key in ["gravity", "position", "velocity"] {
                                p[key] = point(&p[key]);
                            }
                        }
                    }
                    json!([p.id, c])
                })
                .collect::<Vec<_>>();
            json!({"accumulator":v["accumulator"],"chains":map(chains),"inputs":self.parameter_record(&v["inputs"].as_array().into_iter().flatten().map(|v|v.as_f64().unwrap_or(0.0)).collect::<Vec<_>>())})
        } else {
            undefined()
        };
        state["history"]["values"] = self.parameter_record(&self.motion_values);
        let previous_signature = state["history"]["frames"]
            .as_array()
            .into_iter()
            .flatten()
            .map(|frame| {
                Ok((
                    self.motion_index(&frame["motionId"])?,
                    number(frame, "time", 0.0),
                    frame["elapsed"].as_f64(),
                    frame["remaining"].as_f64(),
                ))
            })
            .collect::<Result<Vec<_>, WorkerError>>()?;
        if self.model.document.motion_parameter_base.is_some()
            && previous_signature != self.motion_frames
        {
            let frames=self.selected.frames(&self.model.document.motions).into_iter().chain(self.playbacks.frames(&self.model.document.motions)).map(|f| {
                let mut v=json!({"motionId":self.model.document.motions[f.motion].id,"blend":match f.blend {crate::motion::MotionBlend::Add=>"add",_=>"replace"},"priority":f.priority,"time":f.time,"weight":f.weight,"rate":f.rate});
                if let Some(e)=f.elapsed {v["elapsed"]=json!(e);}
                if let Some(r)=f.remaining {v["remaining"]=json!(r);}v
            }).collect::<Vec<_>>();
            state["history"]["frames"] = json!(frames);
            state["history"]["base"] = self.parameter_record(&self.motion_base);
        }
        for frame in state["history"]["frames"]
            .as_array_mut()
            .into_iter()
            .flatten()
        {
            for key in ["elapsed", "remaining", "rate"] {
                if let Some(value) = frame.get_mut(key)
                    && value.is_null()
                {
                    *value = undefined();
                }
            }
        }
        for key in ["lipSyncLevel", "voiceTarget"] {
            state[key] = optional(&state[key]);
        }
        state["adjustments"]["physicsOptions"] = optional(&state["adjustments"]["physicsOptions"]);
        state["playback"]["completion"] = optional(&state["playback"]["completion"]);
        if let Some(values) = state["parameterValues"].as_object_mut() {
            for value in values.values_mut() {
                if value.is_null() {
                    *value = undefined();
                }
            }
        }
        for entry in state["additional"].as_array_mut().into_iter().flatten() {
            entry["completion"] = optional(&entry["completion"]);
        }
        for kind in ["groups", "parts"] {
            if let Some(entries) = state["renderOverrides"][kind]["__poffoMap"].as_array_mut() {
                for entry in entries {
                    if let Some(fields) = entry[1].as_object_mut() {
                        for value in fields.values_mut() {
                            if value.is_null() {
                                *value = undefined();
                            }
                        }
                    }
                }
            }
        }
        self.worker_state = state.clone();
        Ok(state)
    }
}
