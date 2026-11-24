//! Immutable mesh metadata and nested clipping topology.

use super::resources::Target;
use serde::Deserialize;
use serde_json::Value;
use std::collections::HashMap;

#[derive(Deserialize)]
pub(super) struct Viewport {
    pub(super) width: f32,
    pub(super) height: f32,
}
#[derive(Deserialize)]
pub(super) struct Mesh {
    pub(super) id: String,
    pub(super) vertices: Vec<f32>,
    pub(super) uvs: Vec<f32>,
    pub(super) indices: Vec<u32>,
    pub(super) texture: usize,
}
#[derive(Deserialize)]
pub(super) struct Metadata {
    pub(super) viewport: Viewport,
    pub(super) parts: Vec<Mesh>,
    pub(super) plans: Vec<Value>,
}
#[derive(Clone)]
pub(super) struct Source {
    pub(super) part: usize,
    pub(super) mask: Option<usize>,
    pub(super) inverted: bool,
}
pub(super) struct Mask {
    pub(super) bounds: [u32; 4],
    pub(super) sources: Vec<Source>,
    pub(super) target: Option<Target>,
    pub(super) vertices: Vec<u32>,
}
pub(super) struct Part {
    pub(super) indices: std::ops::Range<u32>,
    pub(super) texture: usize,
    pub(super) mask: Option<usize>,
}
pub(super) fn collect_mask(
    value: &Value,
    lookup: &HashMap<String, usize>,
    cache: &mut HashMap<String, usize>,
    masks: &mut Vec<Mask>,
) -> Option<usize> {
    if value.is_null() {
        return None;
    }
    let key = value.to_string();
    if let Some(index) = cache.get(&key) {
        return Some(*index);
    }
    let sources = value["sources"]
        .as_array()
        .unwrap()
        .iter()
        .map(|source| Source {
            part: lookup[source["partId"].as_str().unwrap()],
            mask: collect_mask(&source["mask"], lookup, cache, masks),
            inverted: source["invertedMask"].as_bool().unwrap_or(false),
        })
        .collect();
    let index = masks.len();
    masks.push(Mask {
        sources,
        target: None,
        bounds: [0, 0, 1, 1],
        vertices: vec![],
    });
    cache.insert(key, index);
    Some(index)
}
