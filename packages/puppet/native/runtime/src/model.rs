//! A validated document compiled into index-based lookups for per-frame evaluation.

mod bindings;
mod masks;
mod scene;

use bindings::{compile_binding, compile_glue_bindings, compile_part_bindings};
use masks::MaskPlans;
pub use masks::{MaskPlan, MaskSource};
pub(crate) use scene::{CompiledSkin, SceneTree};
use scene::{compile_scene, flatten_scene, uses_skinning};

use std::collections::{HashMap, HashSet};
use std::sync::Arc;

use poffo_format::ValidDocument;
use poffo_format::document::{
    AlphaBlendMode, BlendMode, Document, LayerOrderRule, Parameter, Part,
};

use crate::deform::CompiledDeformer;
use crate::keyform::KeyformSpace;
use crate::layers::{self, CompiledGroup, CompiledLayer, GroupPath};
use crate::spatial::{self, Sampler};

/// Resolved rest render properties of a part (`getPartRenderProperties`).
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct PartProperties {
    pub alpha_blend_mode: AlphaBlendMode,
    pub blend_mode: BlendMode,
    /// Hides triangles turned over relative to the rest mesh.
    pub culling: bool,
    pub inverted_mask: bool,
    pub multiply_color: [f64; 3],
    pub opacity: f64,
    pub render_when_used_as_mask: bool,
    pub screen_color: [f64; 3],
}

/// The properties of a part that sets none.
impl Default for PartProperties {
    fn default() -> Self {
        Self {
            alpha_blend_mode: AlphaBlendMode::Over,
            blend_mode: BlendMode::Normal,
            culling: false,
            inverted_mask: false,
            multiply_color: [1.0; 3],
            opacity: 1.0,
            render_when_used_as_mask: true,
            screen_color: [0.0; 3],
        }
    }
}

impl PartProperties {
    fn of(part: &Part) -> Self {
        let p = part.properties.clone().unwrap_or_default();
        let base = Self::default();
        Self {
            alpha_blend_mode: p.alpha_blend_mode.unwrap_or(base.alpha_blend_mode),
            blend_mode: p.blend_mode.unwrap_or(base.blend_mode),
            culling: p.culling.unwrap_or(base.culling),
            inverted_mask: p.inverted_mask.unwrap_or(base.inverted_mask),
            multiply_color: p.multiply_color.unwrap_or(base.multiply_color),
            opacity: p.opacity.unwrap_or(base.opacity),
            render_when_used_as_mask: p
                .render_when_used_as_mask
                .unwrap_or(base.render_when_used_as_mask),
            screen_color: p.screen_color.unwrap_or(base.screen_color),
        }
    }
}

#[derive(Debug, Clone)]
pub(crate) struct CompiledPart {
    pub(crate) rest: Vec<f64>,
    pub(crate) rest_properties: PartProperties,
    /// Bindings deforming this part's vertices, in document order (`getPartBindings`).
    pub(crate) vertex_bindings: Vec<usize>,
    /// Bindings explicitly targeting this part's render properties.
    pub(crate) property_bindings: Vec<usize>,
    pub(crate) mask: Option<Arc<MaskPlan>>,
    pub(crate) used_as_mask: bool,
    /// Groups and offscreen layers the part is drawn in.
    pub(crate) path: GroupPath,
}

#[derive(Debug, Clone)]
pub(crate) struct CompiledBinding {
    pub(crate) parameters: Vec<usize>,
    pub(crate) space: KeyformSpace,
    pub(crate) grid: Option<crate::grid_keyform::GridSpace>,
    pub(crate) step_grid: crate::grid_keyform::GridSpace,
    /// Influence curves over known parameters.
    pub(crate) influences: crate::influence::BindingInfluence,
    /// Per part: the index of its entry in each keyform's `parts`.
    pub(crate) part_entries: HashMap<usize, Vec<Option<usize>>>,
    pub(crate) deformer_entries: HashMap<usize, Vec<Option<usize>>>,
    pub(crate) explicit_parts: Option<HashSet<usize>>,
    pub(crate) explicit_deformers: HashSet<usize>,
}

#[derive(Debug, Clone)]
pub(crate) struct GlueBinding {
    pub(crate) binding: usize,
    pub(crate) coordinates: Vec<Option<[f64; 2]>>,
}

#[derive(Debug, Clone)]
pub(crate) struct CompiledRule {
    pub(crate) parts: Vec<usize>,
    pub(crate) reference: usize,
    pub(crate) rule: LayerOrderRule,
    pub(crate) parameters: Vec<usize>,
}

/// Glue topology resolved once; only strength and weight are keyed per frame.
#[derive(Debug, Clone, Copy)]
pub(crate) struct GlueConnection {
    pub(crate) first_part: usize,
    pub(crate) second_part: usize,
    pub(crate) first_offset: usize,
    pub(crate) second_offset: usize,
    pub(crate) edge: Option<poffo_format::document::GlueEdge>,
    pub(crate) mode: Option<poffo_format::document::GlueMode>,
    pub(crate) rotation: Option<poffo_format::document::GlueRotation>,
    pub(crate) weight: f64,
    pub(crate) strength: f64,
}

/// Static attachment data of a spatial part bound to a spatial deformer's mesh.
#[derive(Debug, Clone)]
pub(crate) struct SpatialStatics {
    /// Stored attachments, or ones derived from the rest control points for older documents.
    pub(crate) attachments: Option<Vec<poffo_format::document::SpatialAttachment>>,
    pub(crate) sampler: Sampler,
}

/// An immutable, validated model. Share it between players with [`Arc`].
#[derive(Debug, Clone)]
pub struct Model {
    pub(crate) document: Document,
    pub(crate) part_index: HashMap<String, usize>,
    pub(crate) parameter_index: HashMap<String, usize>,
    /// The first motion with each id, like `Array.findIndex`.
    pub(crate) motion_index: HashMap<String, usize>,
    pub(crate) parts: Vec<CompiledPart>,
    pub(crate) bindings: Vec<CompiledBinding>,
    pub(crate) deformers: Vec<CompiledDeformer>,
    pub(crate) deformer_index: HashMap<String, usize>,
    pub(crate) deformer_bindings: Vec<Vec<usize>>,
    pub(crate) scene: Vec<SceneTree>,
    pub(crate) geometry_steps: Vec<crate::apply::Step>,
    pub(crate) uses_skinning: bool,
    pub(crate) part_effects: Vec<Vec<crate::compose::EffectBinding>>,
    pub(crate) group_effects: Vec<Vec<crate::compose::EffectBinding>>,
    pub(crate) part_orders: Vec<Vec<crate::draw_order::OrderBinding>>,
    pub(crate) group_orders: Vec<Vec<crate::draw_order::OrderBinding>>,
    /// `(part, visible)` in scene paint order (`getScenePartStates`).
    pub(crate) scene_order: Vec<(usize, bool)>,
    /// Draw order tree; `None` when nothing has a draw order and scene order stands.
    pub(crate) draw_order: Option<Vec<crate::draw_order::DrawItem>>,
    pub(crate) rules: Vec<CompiledRule>,
    pub(crate) spatial_parts: HashMap<usize, SpatialStatics>,
    /// Scene groups in scene order, with their ids.
    pub(crate) groups: Vec<CompiledGroup>,
    pub(crate) group_ids: Vec<String>,
    pub(crate) coordinate_ids: Vec<usize>,
    pub(crate) glue_bindings: Vec<Vec<GlueBinding>>,
    pub(crate) glue_connections: Vec<GlueConnection>,
    pub(crate) geometry_deformers: Vec<Vec<usize>>,
    pub(crate) geometry_cacheable: Vec<bool>,
    /// Offscreen groups in scene order.
    pub(crate) layers: Vec<CompiledLayer>,
    /// `parameterVisibility` intervals of scene containers and parts.
    pub(crate) visibility: crate::visibility::SceneVisibility,
}

impl Model {
    /// Compiles a validated document (see [`poffo_format::PoffoFile::document`]).
    pub fn new(document: ValidDocument) -> Self {
        let document = document.into_inner();
        let part_index: HashMap<String, usize> = document
            .parts
            .iter()
            .enumerate()
            .map(|(i, p)| (p.id.clone(), i))
            .collect();
        let parameter_index: HashMap<String, usize> = document
            .parameters
            .iter()
            .enumerate()
            .map(|(i, p)| (p.id.clone(), i))
            .collect();
        let mut motion_index = HashMap::new();
        for (index, motion) in document.motions.iter().enumerate() {
            motion_index.entry(motion.id.clone()).or_insert(index);
        }
        let mut deformers = Vec::new();
        let mut deformer_index = HashMap::new();
        let default_roots;
        let roots = match &document.scene {
            Some(scene) => scene.roots.as_slice(),
            None => {
                default_roots = document.scene_roots();
                &default_roots
            }
        };
        let scene = compile_scene(roots, &part_index, &mut deformers, &mut deformer_index);
        let mut scene_order = Vec::new();
        flatten_scene(&scene, true, &mut scene_order);
        let scene_groups = layers::scene_groups(roots);
        let mut paths: HashMap<&str, GroupPath> = scene_groups.parts.into_iter().collect();
        let groups = layers::compile_groups(&document, &scene_groups.groups);
        let part_ids: Vec<&str> = document.parts.iter().map(|p| p.id.as_str()).collect();
        let visibility = crate::visibility::SceneVisibility::new(
            roots,
            &scene_groups.groups,
            &part_ids,
            &parameter_index,
        );
        let mut masks = MaskPlans::new(&document, &part_index);
        let layers: Vec<CompiledLayer> = scene_groups
            .layers
            .iter()
            .map(|(group, path, visible)| CompiledLayer {
                group: *group,
                path: path.clone(),
                visible: *visible,
                mask: masks.sources(&groups[*group].properties.clipping_mask_ids),
            })
            .collect();
        let group_ids: Vec<String> = scene_groups
            .groups
            .iter()
            .map(|g| g.id().to_owned())
            .collect();
        let draw_order = crate::draw_order::compile(
            roots,
            &part_index,
            &group_ids,
            crate::draw_order::uses_draw_order(&document, &groups),
        );
        let layer_mask_ids: Vec<String> = layers
            .iter()
            .flat_map(|layer| groups[layer.group].properties.clipping_mask_ids.clone())
            .collect();

        let bindings: Vec<CompiledBinding> = document
            .parameter_bindings
            .iter()
            .map(|b| {
                compile_binding(
                    b,
                    &parameter_index,
                    &part_index,
                    &deformer_index,
                    &document.parameters,
                )
            })
            .collect();
        let used_as_mask: HashSet<usize> = document
            .parts
            .iter()
            .flat_map(|p| {
                p.properties
                    .iter()
                    .flat_map(|props| props.clipping_mask_ids.iter().flatten())
            })
            .chain(&layer_mask_ids)
            .filter_map(|id| part_index.get(id).copied())
            .collect();
        let part_bindings = compile_part_bindings(&document, &bindings);
        let parts = document
            .parts
            .iter()
            .zip(part_bindings)
            .enumerate()
            .map(|(index, (part, bindings))| CompiledPart {
                rest: part.mesh.vertices.clone(),
                rest_properties: PartProperties::of(part),
                // Only bindings that key this part's vertices in some keyform move them
                // (`getPartBindings`); the rest would add zero deltas.
                vertex_bindings: bindings.vertices,
                property_bindings: bindings.properties,
                mask: masks.part(index),
                used_as_mask: used_as_mask.contains(&index),
                path: paths
                    .remove(part.id.as_str())
                    .unwrap_or_else(GroupPath::root),
            })
            .collect();
        let rules = document
            .layer_order_rules
            .iter()
            .filter_map(|rule| {
                Some(CompiledRule {
                    parts: rule
                        .part_ids
                        .iter()
                        .filter_map(|id| part_index.get(id).copied())
                        .collect(),
                    reference: part_index.get(&rule.reference_part_id).copied()?,
                    parameters: rule
                        .when
                        .parameter_ids
                        .iter()
                        .filter_map(|id| parameter_index.get(id).copied())
                        .collect(),
                    rule: rule.clone(),
                })
            })
            .collect();
        let spatial_parts = document
            .parts
            .iter()
            .enumerate()
            .filter_map(|(index, part)| {
                let surface = part.spatial.as_ref()?;
                let deformer = &deformers[*deformer_index.get(surface.group_id.as_deref()?)?];
                let mesh = deformer
                    .node
                    .spatial_mesh
                    .as_ref()
                    .filter(|_| deformer.is_spatial())?;
                let sampler = Sampler::new(mesh);
                let rest = deformer.node.spatial_mesh_position.unwrap_or([0.0; 3]);
                let attachments = surface
                    .attachments
                    .clone()
                    .or_else(|| spatial::legacy_attachments(surface, mesh, &sampler, rest));
                Some((
                    index,
                    SpatialStatics {
                        attachments,
                        sampler,
                    },
                ))
            })
            .collect();
        let glue_bindings = compile_glue_bindings(&document);
        let glue_connections = document
            .glue
            .iter()
            .map(|glue| GlueConnection {
                first_part: part_index[&glue.first.part_id],
                second_part: part_index[&glue.second.part_id],
                first_offset: glue.first.vertex_index * 2,
                second_offset: glue.second.vertex_index * 2,
                edge: glue.second.edge,
                mode: glue.mode,
                rotation: glue.rotation,
                weight: glue.weight,
                strength: glue.strength,
            })
            .collect();
        let mut deformer_bindings = vec![Vec::new(); deformers.len()];
        for (index, binding) in bindings.iter().enumerate() {
            for &deformer in &binding.explicit_deformers {
                deformer_bindings[deformer].push(index);
            }
        }
        let mut model = Self {
            uses_skinning: uses_skinning(&scene),
            part_effects: Vec::new(),
            group_effects: Vec::new(),
            part_orders: Vec::new(),
            group_orders: Vec::new(),
            geometry_deformers: Vec::new(),
            geometry_cacheable: Vec::new(),
            spatial_parts,
            glue_bindings,
            glue_connections,
            document,
            part_index,
            parameter_index,
            motion_index,
            parts,
            bindings,
            coordinate_ids: (0..deformers.len()).collect(),
            deformers,
            deformer_index,
            deformer_bindings,
            geometry_steps: crate::apply::compile_steps(&scene),
            scene,
            scene_order,
            draw_order,
            rules,
            groups,
            group_ids,
            layers,
            visibility,
        };
        (model.geometry_deformers, model.geometry_cacheable) =
            crate::geometry_cache::dependencies(&model);
        model.part_effects = (0..model.parts.len())
            .map(|part| model.compile_part_effects(part))
            .collect();
        model.group_effects = (0..model.groups.len())
            .map(|group| model.compile_group_effects(group))
            .collect();
        model.part_orders = (0..model.parts.len())
            .map(|part| model.compile_part_orders(part))
            .collect();
        model.group_orders = (0..model.groups.len())
            .map(|group| model.compile_group_orders(group))
            .collect();
        model
    }

    pub fn document(&self) -> &Document {
        &self.document
    }

    pub fn parameters(&self) -> &[Parameter] {
        &self.document.parameters
    }

    pub fn parameter_index(&self, id: &str) -> Option<usize> {
        self.parameter_index.get(id).copied()
    }

    /// The index of the first motion with this id.
    pub fn motion_index(&self, id: &str) -> Option<usize> {
        self.motion_index.get(id).copied()
    }

    pub fn part_index(&self, id: &str) -> Option<usize> {
        self.part_index.get(id).copied()
    }

    pub fn parts(&self) -> &[Part] {
        &self.document.parts
    }

    /// Each motion's duration by index; 0 for unknown motions.
    pub(crate) fn motion_duration(&self) -> impl Fn(usize) -> f64 + '_ {
        |motion| {
            self.document
                .motions
                .get(motion)
                .map_or(0.0, |m| m.duration)
        }
    }

    /// The static clip plan of a part, if it is masked.
    pub fn mask_plan(&self, part: usize) -> Option<&Arc<MaskPlan>> {
        self.parts.get(part)?.mask.as_ref()
    }
}
