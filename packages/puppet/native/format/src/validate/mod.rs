//! Document validation, ported from `player/parse-document.ts` and its `parse-*` helpers.
//!
//! Differences from the TypeScript validator: mesh geometry checks (`mesh/validate.ts`:
//! intersecting edges, duplicate vertices, non-manifold edges) are not performed, because
//! they guard editing quality and do not affect playback, so `mesh.validationSpace: indices`
//! (which only skips them) validates like any other mesh; spatial mesh `source` (editor
//! metadata) is not inspected.

mod bindings;
mod chains;
mod deformer;
mod glue;
mod groups;
mod model;
mod motions;
mod parameters;
mod parts;
mod presets;
mod references;
mod visibility;

/// Helpers shared with the runtime.
pub mod references_api {
    pub use super::references::resolve_parameter_value;
}

use std::collections::{HashMap, HashSet};

use bindings::validate_binding_shape;
use motions::validate_motion;
use parameters::validate_parameter;
use parts::validate_part;

use crate::document::{
    DOCUMENT_VERSION, DeformerNode, DeformerRenderProperties, Document, FRAMES_PER_SECOND_RANGE,
    GroupNode, GroupRenderProperties, KeyformRange, Parameter, ParameterBinding, Part,
    PartKeyformProperties, PartRenderProperties, Scene, SceneNode, is_document_format,
};
use crate::error::FormatError;

pub(crate) type Check = Result<(), FormatError>;

pub(crate) fn ensure(condition: bool, path: impl FnOnce() -> String, reason: &str) -> Check {
    if condition {
        Ok(())
    } else {
        Err(FormatError::invalid(path(), reason))
    }
}

pub(crate) fn unique<'a>(ids: impl IntoIterator<Item = &'a str>) -> bool {
    let mut seen = HashSet::new();
    ids.into_iter().all(|id| seen.insert(id))
}

pub(crate) fn non_empty_unique(ids: &[String]) -> bool {
    ids.iter().all(|id| !id.is_empty()) && unique(ids.iter().map(String::as_str))
}

/// Non-empty, distinct ids that all name entries of `known`.
pub(crate) fn known_unique<V>(ids: &[String], known: &HashMap<&str, V>) -> bool {
    !ids.is_empty()
        && unique(ids.iter().map(String::as_str))
        && ids.iter().all(|id| known.contains_key(id.as_str()))
}

pub(crate) fn is_ratio(value: f64) -> bool {
    (0.0..=1.0).contains(&value)
}

/// An optional fade time: finite and non-negative.
pub(crate) fn is_fade(time: Option<f64>) -> bool {
    time.is_none_or(|t| t.is_finite() && t >= 0.0)
}

/// `value`'s bits with -0 read as 0, so equal JavaScript numbers share one key (JavaScript
/// writes both as `0`).
pub(crate) fn number_key(value: f64) -> u64 {
    if value == 0.0 { 0 } else { value.to_bits() }
}

/// Cubism draw orders are 0..=1000.
pub(crate) fn is_draw_order(value: f64) -> bool {
    (0.0..=crate::document::MAXIMUM_DRAW_ORDER).contains(&value)
}

/// Whether a binding's keyed samples may leave display ranges (`keyformRange: unbounded`).
pub(crate) fn is_unbounded(binding: &ParameterBinding) -> bool {
    binding.keyform_range == Some(KeyformRange::Unbounded)
}

/// A keyed ratio (opacity, glue strength): `0..=1`, or any finite number when `unbounded`.
pub(crate) fn is_keyed_ratio(value: f64, unbounded: bool) -> bool {
    if unbounded {
        value.is_finite()
    } else {
        is_ratio(value)
    }
}

/// A keyed color whose channels are [`is_keyed_ratio`].
pub(crate) fn is_keyed_color(color: &[f64; 3], unbounded: bool) -> bool {
    color.iter().all(|&c| is_keyed_ratio(c, unbounded))
}

/// A keyed draw order: [`is_draw_order`], or any finite number when `unbounded`.
pub(crate) fn is_keyed_draw_order(value: f64, unbounded: bool) -> bool {
    if unbounded {
        value.is_finite()
    } else {
        is_draw_order(value)
    }
}

/// The opacity, colors and draw order of part, group and deformer render properties and of
/// their keyforms. Rest properties are checked bounded; an `unbounded` binding's keyforms
/// may leave the display ranges.
#[derive(Clone, Copy, Default)]
pub(crate) struct Effect<'a> {
    pub opacity: Option<f64>,
    pub multiply_color: Option<&'a [f64; 3]>,
    pub screen_color: Option<&'a [f64; 3]>,
    pub draw_order: Option<f64>,
}

impl Effect<'_> {
    pub fn opacity_ok(&self, unbounded: bool) -> bool {
        self.opacity.is_none_or(|v| is_keyed_ratio(v, unbounded))
    }

    pub fn colors_ok(&self, unbounded: bool) -> bool {
        [self.multiply_color, self.screen_color]
            .into_iter()
            .flatten()
            .all(|c| is_keyed_color(c, unbounded))
    }

    pub fn draw_order_ok(&self, unbounded: bool) -> bool {
        self.draw_order
            .is_none_or(|v| is_keyed_draw_order(v, unbounded))
    }

    /// Opacity and colors within 0..=1 and draw order within 0..=1000, or any finite values
    /// when `unbounded`.
    pub fn ok(&self, unbounded: bool) -> bool {
        self.opacity_ok(unbounded) && self.colors_ok(unbounded) && self.draw_order_ok(unbounded)
    }
}

impl<'a> From<&'a PartRenderProperties> for Effect<'a> {
    fn from(p: &'a PartRenderProperties) -> Self {
        Self {
            opacity: p.opacity,
            multiply_color: p.multiply_color.as_ref(),
            screen_color: p.screen_color.as_ref(),
            draw_order: p.draw_order,
        }
    }
}

impl<'a> From<&'a PartKeyformProperties> for Effect<'a> {
    fn from(p: &'a PartKeyformProperties) -> Self {
        Self {
            opacity: p.opacity,
            multiply_color: p.multiply_color.as_ref(),
            screen_color: p.screen_color.as_ref(),
            draw_order: p.draw_order,
        }
    }
}

impl<'a> From<&'a GroupRenderProperties> for Effect<'a> {
    fn from(p: &'a GroupRenderProperties) -> Self {
        Self {
            opacity: p.opacity,
            multiply_color: p.multiply_color.as_ref(),
            screen_color: p.screen_color.as_ref(),
            draw_order: p.draw_order,
        }
    }
}

impl<'a> From<&'a DeformerRenderProperties> for Effect<'a> {
    fn from(p: &'a DeformerRenderProperties) -> Self {
        Self {
            opacity: p.opacity,
            multiply_color: p.multiply_color.as_ref(),
            screen_color: p.screen_color.as_ref(),
            draw_order: None,
        }
    }
}

/// Document entries by id, built once for the cross-reference rules.
///
/// Built after part and parameter ids are checked to be unique; scene node ids (deformers,
/// groups) are checked by [`references::validate_scene`] before any rule reads them.
pub(crate) struct Index<'a> {
    pub parts: HashMap<&'a str, &'a Part>,
    pub parameters: HashMap<&'a str, &'a Parameter>,
    pub deformers: HashMap<&'a str, &'a DeformerNode>,
    /// Scene groups in document order.
    pub groups: Vec<&'a GroupNode>,
    pub group_ids: HashSet<&'a str>,
}

impl<'a> Index<'a> {
    fn new(document: &'a Document) -> Self {
        let mut deformers = HashMap::new();
        let mut groups = Vec::new();
        for node in document.scene.iter().flat_map(Scene::nodes) {
            match node {
                SceneNode::Deformer(deformer) => {
                    deformers.insert(deformer.id.as_str(), deformer.as_ref());
                }
                SceneNode::Group(group) => groups.push(group),
                SceneNode::Part(_) => {}
            }
        }
        Self {
            parts: document.parts.iter().map(|p| (p.id.as_str(), p)).collect(),
            parameters: document
                .parameters
                .iter()
                .map(|p| (p.id.as_str(), p))
                .collect(),
            deformers,
            group_ids: groups.iter().map(|g| g.id.as_str()).collect(),
            groups,
        }
    }
}

/// A [`Document`] that passed [`validate`]. The runtime indexes parts, parameters and
/// keyforms by the references validation checked, so it only accepts this type.
#[derive(Debug, Clone, PartialEq)]
pub struct ValidDocument(Document);

impl ValidDocument {
    /// Validates `document`.
    pub fn new(document: Document) -> Result<Self, FormatError> {
        validate(&document)?;
        Ok(Self(document))
    }

    pub fn into_inner(self) -> Document {
        self.0
    }
}

impl std::ops::Deref for ValidDocument {
    type Target = Document;

    fn deref(&self) -> &Document {
        &self.0
    }
}

pub fn validate(document: &Document) -> Check {
    ensure(
        is_document_format(&document.format),
        || "format".into(),
        "unknown format",
    )?;
    ensure(
        document.version == DOCUMENT_VERSION,
        || "version".into(),
        "unsupported version",
    )?;
    if let Some(fps) = document.frames_per_second {
        ensure(
            FRAMES_PER_SECOND_RANGE.contains(&fps),
            || "framesPerSecond".into(),
            "must be 1..=240",
        )?;
    }
    let viewport = document.viewport;
    ensure(
        viewport.width > 0.0 && viewport.height > 0.0,
        || "viewport".into(),
        "must be positive",
    )?;

    for (index, part) in document.parts.iter().enumerate() {
        validate_part(part, &format!("parts[{index}]"))?;
    }
    ensure(
        unique(document.parts.iter().map(|p| p.id.as_str())),
        || "parts".into(),
        "duplicate part id",
    )?;
    for (index, motion) in document.motions.iter().enumerate() {
        validate_motion(motion, &format!("motions[{index}]"))?;
    }
    ensure(
        unique(document.motions.iter().map(|m| m.id.as_str())),
        || "motions".into(),
        "duplicate motion id",
    )?;
    for (index, parameter) in document.parameters.iter().enumerate() {
        validate_parameter(parameter, &format!("parameters[{index}]"))?;
    }
    ensure(
        unique(document.parameters.iter().map(|p| p.id.as_str())),
        || "parameters".into(),
        "duplicate parameter id",
    )?;
    for (index, binding) in document.parameter_bindings.iter().enumerate() {
        validate_binding_shape(binding, &format!("parameterBindings[{index}]"))?;
    }
    ensure(
        unique(document.parameter_bindings.iter().map(|b| b.id.as_str())),
        || "parameterBindings".into(),
        "duplicate binding id",
    )?;

    let index = Index::new(document);
    if let Some(scene) = &document.scene {
        references::validate_scene(scene, &index)?;
    }
    visibility::validate_parameter_visibility(document, &index)?;
    references::validate_layer_order(document, &index)?;
    glue::validate_glue(document, &index)?;
    references::validate_physics(document, &index)?;
    chains::validate_chains(document, &index)?;
    presets::validate_presets(document, &index)?;
    references::validate_masks(&document.parts)?;
    references::validate_spatial_attachments(document, &index)?;
    references::validate_tracks(document, &index)?;
    references::validate_bindings(document, &index)?;
    model::validate_model(document, &index)?;
    groups::validate_groups(document, &index)
}

/// Documents for the validation tests: a minimal valid document and parts to extend it with.
#[cfg(test)]
pub(crate) mod test_support {
    use serde_json::{Value, json};

    use crate::PoffoFile;

    /// Adds `extra`'s fields to the object `target`, replacing fields of the same name.
    pub fn merge(mut target: Value, extra: Value) -> Value {
        if let (Some(object), Value::Object(extra)) = (target.as_object_mut(), extra) {
            object.extend(extra);
        }
        target
    }

    /// A valid document without parts, motions or parameters, with `extra` merged in.
    pub fn document(extra: Value) -> Value {
        merge(
            json!({"format": "winter-love-puppet", "version": 1,
                "viewport": {"width": 1, "height": 1}, "parts": [], "motions": []}),
            extra,
        )
    }

    /// A one-triangle part with a 1×1 texture.
    pub fn triangle(id: &str) -> Value {
        json!({"id": id, "mesh": {"vertices": [0, 0, 1, 0, 0, 1], "uvs": [0, 0, 1, 0, 0, 1],
            "indices": [0, 1, 2]}, "texture": {"src": "a.png", "width": 1, "height": 1}})
    }

    /// A scene node for the part `id`.
    pub fn part_node(id: &str) -> Value {
        json!({"kind": "part", "id": id, "name": id, "visible": true, "locked": false})
    }

    /// A parameter over `minimum..=maximum` defaulting to `default`.
    pub fn parameter(id: &str, minimum: f64, maximum: f64, default: f64) -> Value {
        json!({"id": id, "name": id, "minimum": minimum, "maximum": maximum,
            "defaultValue": default})
    }

    /// Whether `document` parses and validates.
    pub fn accepts(document: Value) -> bool {
        PoffoFile::from_value(document).document().is_ok()
    }
}
