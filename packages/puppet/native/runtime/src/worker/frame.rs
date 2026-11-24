//! Lossless numeric render packets with replacement-only structural templates.
use super::map;
use crate::{MaskPlan, Model, Player};
use poffo_format::document::{AlphaBlendMode, BlendMode};
use serde_json::{Value, json};
use std::{collections::HashMap, sync::Arc};

#[derive(PartialEq)]
struct Structure {
    layers: Vec<String>,
    mask: Option<Arc<MaskPlan>>,
    alpha: AlphaBlendMode,
    blend: BlendMode,
    inverted: bool,
    culling: Option<bool>,
    render_mask: Option<bool>,
}
impl Structure {
    fn matches(&self, candidate: &Self, layers: &[usize], frame: &crate::Frame) -> bool {
        self.mask == candidate.mask
            && self.alpha == candidate.alpha
            && self.blend == candidate.blend
            && self.inverted == candidate.inverted
            && self.culling == candidate.culling
            && self.render_mask == candidate.render_mask
            && self.layers.len() == layers.len()
            && self
                .layers
                .iter()
                .zip(layers)
                .all(|(id, &index)| *id == frame.layers[index].id)
    }
    fn template(&self, id: &str, clipping: Value, part: bool) -> Value {
        let mut properties = json!({
            "alphaBlendMode":enum_name(self.alpha),"blendMode":enum_name(self.blend),
            "clippingMaskIds":clipping,"invertedMask":self.inverted
        });
        if part {
            properties["culling"] = json!(self.culling);
            properties["renderWhenUsedAsMask"] = json!(self.render_mask);
        }
        json!({
            if part {"partId"} else {"groupId"}:id,
            "layerIds":self.layers,"properties":properties
        })
    }
}
#[derive(Default)]
pub(super) struct FrameEncoder {
    parts: Vec<Option<Structure>>,
    layers: HashMap<String, (usize, Structure)>,
    pub(super) part_values: Vec<f64>,
    pub(super) layer_values: Vec<f64>,
}
impl FrameEncoder {
    pub(super) fn encode(&mut self, player: &Player) -> Value {
        let model = &player.model;
        let frame = &player.frame;
        let layer_ids = |indices: &[usize]| {
            indices
                .iter()
                .map(|&index| frame.layers[index].id.clone())
                .collect()
        };
        self.parts.resize_with(model.document.parts.len(), || None);
        self.part_values.clear();
        self.layer_values.clear();
        let mut parts = Vec::new();
        for plan in &frame.plans {
            let properties = &plan.properties;
            let mut structure = Structure {
                layers: Vec::new(),
                mask: plan.mask.clone(),
                alpha: properties.alpha_blend_mode,
                blend: properties.blend_mode,
                inverted: properties.inverted_mask,
                culling: Some(properties.culling),
                render_mask: Some(properties.render_when_used_as_mask),
            };
            if self.parts[plan.part]
                .as_ref()
                .is_none_or(|previous| !previous.matches(&structure, &plan.layers, frame))
            {
                structure.layers = layer_ids(&plan.layers);
                let part = &model.document.parts[plan.part];
                let clipping = part
                    .properties
                    .as_ref()
                    .and_then(|p| p.clipping_mask_ids.as_ref())
                    .cloned()
                    .unwrap_or_default();
                let mut template = structure.template(&part.id, json!(clipping), true);
                if let Some(value) = &plan.mask {
                    template["mask"] = mask(value, model);
                }
                parts.push(json!([plan.part, template]));
                self.parts[plan.part] = Some(structure);
            }
            self.part_values.extend([
                plan.part as f64,
                f64::from(plan.render),
                f64::from(plan.visible),
                properties.opacity,
                properties.multiply_color[0],
                properties.multiply_color[1],
                properties.multiply_color[2],
                properties.screen_color[0],
                properties.screen_color[1],
                properties.screen_color[2],
            ]);
        }
        let mut layers = Vec::new();
        for plan in &frame.layers {
            let properties = &plan.properties;
            let mut structure = Structure {
                layers: Vec::new(),
                mask: plan.mask.clone(),
                alpha: properties.alpha_blend_mode,
                blend: properties.blend_mode,
                inverted: properties.inverted_mask,
                culling: None,
                render_mask: None,
            };
            let index = self
                .layers
                .get(&plan.id)
                .map_or(self.layers.len(), |entry| entry.0);
            if self
                .layers
                .get(&plan.id)
                .is_none_or(|entry| !entry.1.matches(&structure, &plan.layers, frame))
            {
                structure.layers = layer_ids(&plan.layers);
                let clipping = model
                    .group_ids
                    .iter()
                    .position(|id| id == &plan.id)
                    .map(|i| model.groups[i].properties.clipping_mask_ids.clone())
                    .unwrap_or_default();
                let mut template = structure.template(&plan.id, json!(clipping), false);
                if let Some(value) = &plan.mask {
                    template["mask"] = mask(value, model);
                }
                layers.push(json!([index, template]));
                self.layers.insert(plan.id.clone(), (index, structure));
            }
            let effect = &properties.effect;
            self.layer_values.extend([
                index as f64,
                f64::from(plan.visible),
                effect.opacity,
                effect.multiply_color[0],
                effect.multiply_color[1],
                effect.multiply_color[2],
                effect.screen_color[0],
                effect.screen_color[1],
                effect.screen_color[2],
            ]);
        }
        let mut spatial = frame.spatial_poses.iter().collect::<Vec<_>>();
        spatial.sort_by_key(|(i, _)| **i);
        let spatial = spatial.into_iter().map(|(&index,pose)|json!([model.document.parts[index].id,{
            "vertices":pose.vertices,"depths":pose.depths,"depth":pose.depth,"facing":pose.facing
        }])).collect();
        json!({"partTemplates":parts,"layerTemplates":layers,"spatialPoses":map(spatial)})
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
}
