//! A validated document compiled into index-based lookups for per-frame evaluation.

use std::collections::{HashMap, HashSet};
use std::sync::Arc;

use poffo_format::ValidDocument;
use poffo_format::document::{
    AlphaBlendMode, BlendMode, Document, LayerOrderRule, Parameter, ParameterBinding, Part,
    SceneNode,
};

use crate::deform::CompiledDeformer;
use crate::deform::skin::Matrix;
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

/// Clip sources of a masked part; each source may itself be masked.
///
/// Plans nest as deep as a document's mask chains, which validation does not limit, so
/// equality, `Debug` and dropping walk them without recursion. Within one [`Model`], equal plans
/// are the same [`Arc`], so comparing them by pointer ([`Arc::ptr_eq`]) is enough there.
#[derive(Clone)]
pub struct MaskPlan {
    pub sources: Vec<MaskSource>,
}

#[derive(Debug, Clone)]
pub struct MaskSource {
    pub part: usize,
    /// The source part's own `invertedMask`, applied to its nested mask.
    pub inverted_mask: bool,
    pub mask: Option<Arc<MaskPlan>>,
}

impl MaskSource {
    /// Equal apart from the nested masks, which are equal when pointers match.
    fn shallow_eq(&self, other: &Self) -> bool {
        self.part == other.part
            && self.inverted_mask == other.inverted_mask
            && self.mask.is_some() == other.mask.is_some()
    }
}

/// Structural equality, short-cutting on shared [`Arc`]s.
impl PartialEq for MaskPlan {
    fn eq(&self, other: &Self) -> bool {
        // Nested pairs still to compare; allocates only for nested masks at different addresses.
        let mut pending = Vec::new();
        let mut pair = (self, other);
        loop {
            let (a, b) = pair;
            if !std::ptr::eq(a, b) {
                if a.sources.len() != b.sources.len() {
                    return false;
                }
                for (x, y) in a.sources.iter().zip(&b.sources) {
                    if !x.shallow_eq(y) {
                        return false;
                    }
                    if let (Some(x), Some(y)) = (&x.mask, &y.mask)
                        && !Arc::ptr_eq(x, y)
                    {
                        pending.push((&**x, &**y));
                    }
                }
            }
            match pending.pop() {
                Some(next) => pair = next,
                None => return true,
            }
        }
    }
}

impl Eq for MaskPlan {}

impl PartialEq for MaskSource {
    fn eq(&self, other: &Self) -> bool {
        self.shallow_eq(other)
            && match (&self.mask, &other.mask) {
                (Some(a), Some(b)) => a == b,
                _ => true,
            }
    }
}

impl Eq for MaskSource {}

/// Lists the sources one level deep; a nested mask shows only as present.
impl std::fmt::Debug for MaskPlan {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        struct Shallow<'a>(&'a MaskSource);
        impl std::fmt::Debug for Shallow<'_> {
            fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
                f.debug_struct("MaskSource")
                    .field("part", &self.0.part)
                    .field("inverted_mask", &self.0.inverted_mask)
                    .field("masked", &self.0.mask.is_some())
                    .finish()
            }
        }
        f.debug_struct("MaskPlan")
            .field(
                "sources",
                &self.sources.iter().map(Shallow).collect::<Vec<_>>(),
            )
            .finish()
    }
}

/// Releases nested plans this plan last owns one at a time instead of recursively.
impl Drop for MaskPlan {
    fn drop(&mut self) {
        let mut owned: Vec<Arc<MaskPlan>> = self
            .sources
            .iter_mut()
            .filter_map(|source| source.mask.take())
            .collect();
        while let Some(plan) = owned.pop() {
            if let Some(mut plan) = Arc::into_inner(plan) {
                owned.extend(
                    plan.sources
                        .iter_mut()
                        .filter_map(|source| source.mask.take()),
                );
            }
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
pub(crate) struct CompiledSkin {
    pub(crate) bind: Matrix,
    /// `(deformer id, inverse bind, per-vertex weights)`.
    pub(crate) influences: Vec<(String, Matrix, Vec<f64>)>,
}

/// Scene graph with resolved part and deformer indices.
#[derive(Debug, Clone)]
pub(crate) enum SceneTree {
    Group {
        visible: bool,
        children: Vec<SceneTree>,
    },
    Deformer {
        index: usize,
        visible: bool,
        children: Vec<SceneTree>,
    },
    Part {
        part: Option<usize>,
        visible: bool,
        skin: Option<CompiledSkin>,
    },
}

#[derive(Debug, Clone)]
pub(crate) struct CompiledRule {
    pub(crate) parts: Vec<usize>,
    pub(crate) reference: usize,
    pub(crate) rule: LayerOrderRule,
    pub(crate) parameters: Vec<usize>,
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
    pub(crate) geometry_deformers: Vec<Vec<usize>>,
    pub(crate) geometry_cacheable: Vec<bool>,
    /// Offscreen groups in scene order.
    pub(crate) layers: Vec<CompiledLayer>,
    /// `parameterVisibility` intervals of scene containers and parts.
    pub(crate) visibility: crate::visibility::SceneVisibility,
}

fn compile_scene(
    nodes: &[SceneNode],
    part_index: &HashMap<String, usize>,
    deformers: &mut Vec<CompiledDeformer>,
    deformer_index: &mut HashMap<String, usize>,
) -> Vec<SceneTree> {
    let lookup = |id: &str| part_index.get(id).copied();
    nodes
        .iter()
        .map(|node| match node {
            SceneNode::Group(group) => SceneTree::Group {
                visible: group.visible,
                children: compile_scene(&group.children, part_index, deformers, deformer_index),
            },
            SceneNode::Deformer(deformer) => {
                let index = deformers.len();
                deformers.push(CompiledDeformer::new(deformer, &lookup));
                deformer_index.insert(deformer.id.clone(), index);
                SceneTree::Deformer {
                    index,
                    visible: deformer.visible,
                    children: compile_scene(
                        &deformer.children,
                        part_index,
                        deformers,
                        deformer_index,
                    ),
                }
            }
            SceneNode::Part(part) => SceneTree::Part {
                part: part_index.get(&part.id).copied(),
                visible: part.visible,
                skin: part.skinning.as_ref().map(|skin| CompiledSkin {
                    bind: skin.bind.into(),
                    influences: skin
                        .influences
                        .iter()
                        .map(|i| (i.node_id.clone(), i.inverse_bind.into(), i.weights.clone()))
                        .collect(),
                }),
            },
        })
        .collect()
}

fn flatten_scene(nodes: &[SceneTree], visible: bool, out: &mut Vec<(usize, bool)>) {
    for node in nodes {
        match node {
            SceneTree::Group {
                visible: v,
                children,
            }
            | SceneTree::Deformer {
                visible: v,
                children,
                ..
            } => {
                flatten_scene(children, visible && *v, out);
            }
            SceneTree::Part {
                part: Some(part),
                visible: v,
                ..
            } => out.push((*part, visible && *v)),
            SceneTree::Part { part: None, .. } => {}
        }
    }
}

/// A plan's sources with each nested plan by address: interned plans are equal exactly when
/// their keys are.
type SourcesKey = Vec<(usize, bool, Option<*const MaskPlan>)>;

/// Builds each part's clip plan once, sharing it with every plan that uses the part as a source
/// and with every equal plan. Works with an explicit stack: chains can be arbitrarily deep.
struct MaskPlans<'d> {
    document: &'d Document,
    part_index: &'d HashMap<String, usize>,
    plans: Vec<MaskState>,
    /// Each distinct plan by its sources, whose nested plans are themselves interned.
    interned: HashMap<SourcesKey, Arc<MaskPlan>>,
}

#[derive(Clone)]
enum MaskState {
    Unvisited,
    /// Being built: a source reached again closes a cycle (validation rejects those) and is
    /// left unmasked.
    Building,
    Built(Option<Arc<MaskPlan>>),
}

impl<'d> MaskPlans<'d> {
    fn new(document: &'d Document, part_index: &'d HashMap<String, usize>) -> Self {
        Self {
            document,
            part_index,
            plans: vec![MaskState::Unvisited; document.parts.len()],
            interned: HashMap::new(),
        }
    }

    /// The mask ids of `part`.
    fn mask_ids(&self, part: usize) -> &'d [String] {
        let document = self.document;
        document.parts[part]
            .properties
            .as_ref()
            .and_then(|p| p.clipping_mask_ids.as_deref())
            .unwrap_or_default()
    }

    /// Known parts among `ids`, in order.
    fn resolve<'a>(&'a self, ids: &'a [String]) -> impl Iterator<Item = usize> + 'a {
        ids.iter().filter_map(|id| self.part_index.get(id).copied())
    }

    /// The plan of `root`, building it and everything it nests in post-order first.
    fn part(&mut self, root: usize) -> Option<Arc<MaskPlan>> {
        // `(part, sources pushed)`: a part is built once all its sources are.
        let mut stack = vec![(root, false)];
        while let Some((part, expanded)) = stack.pop() {
            match (&self.plans[part], expanded) {
                (MaskState::Unvisited, false) => {
                    self.plans[part] = MaskState::Building;
                    stack.push((part, true));
                    let ids = self.mask_ids(part);
                    let sources: Vec<usize> = self
                        .resolve(ids)
                        .filter(|&s| matches!(self.plans[s], MaskState::Unvisited))
                        .collect();
                    stack.extend(sources.into_iter().map(|s| (s, false)));
                }
                (_, true) => {
                    let plan = self.assemble(self.mask_ids(part));
                    self.plans[part] = MaskState::Built(plan);
                }
                // Built already, or an ancestor still building (a cycle).
                (MaskState::Built(_) | MaskState::Building, false) => {}
            }
        }
        self.built(root)
    }

    fn built(&self, part: usize) -> Option<Arc<MaskPlan>> {
        match &self.plans[part] {
            MaskState::Built(plan) => plan.clone(),
            MaskState::Unvisited | MaskState::Building => None,
        }
    }

    /// The clip plan of the mask sources `ids`, each with its own nested mask.
    fn sources(&mut self, ids: &[String]) -> Option<Arc<MaskPlan>> {
        let sources: Vec<usize> = self.resolve(ids).collect();
        for source in sources {
            self.part(source);
        }
        self.assemble(ids)
    }

    /// The plan of `ids` from the sources' plans built so far.
    fn assemble(&mut self, ids: &[String]) -> Option<Arc<MaskPlan>> {
        if ids.is_empty() {
            return None;
        }
        let sources: Vec<MaskSource> = self
            .resolve(ids)
            .map(|source| MaskSource {
                part: source,
                inverted_mask: PartProperties::of(&self.document.parts[source]).inverted_mask,
                mask: self.built(source),
            })
            .collect();
        let key = sources
            .iter()
            .map(|s| (s.part, s.inverted_mask, s.mask.as_ref().map(Arc::as_ptr)))
            .collect();
        Some(Arc::clone(
            self.interned
                .entry(key)
                .or_insert_with(|| Arc::new(MaskPlan { sources })),
        ))
    }
}

fn compile_binding(
    binding: &ParameterBinding,
    parameter_index: &HashMap<String, usize>,
    part_index: &HashMap<String, usize>,
    deformer_index: &HashMap<String, usize>,
    parameters: &[Parameter],
) -> CompiledBinding {
    let values: Vec<Vec<f64>> = binding.keyforms.iter().map(|k| k.values.clone()).collect();
    let mut part_entries: HashMap<usize, Vec<Option<usize>>> = HashMap::new();
    let mut deformer_entries: HashMap<usize, Vec<Option<usize>>> = HashMap::new();
    for (k, keyform) in binding.keyforms.iter().enumerate() {
        for (entry, deformer) in keyform.deformers.iter().flatten().enumerate() {
            if let Some(&index) = deformer_index.get(&deformer.node_id) {
                deformer_entries
                    .entry(index)
                    .or_insert_with(|| vec![None; binding.keyforms.len()])[k]
                    .get_or_insert(entry);
            }
        }
        for (entry, part) in keyform.parts.iter().enumerate() {
            if let Some(&index) = part_index.get(&part.part_id) {
                part_entries
                    .entry(index)
                    .or_insert_with(|| vec![None; binding.keyforms.len()])[k] = Some(entry);
            }
        }
    }
    let step_grid = crate::grid_keyform::GridSpace::new(binding, parameters);
    CompiledBinding {
        parameters: binding
            .parameter_ids
            .iter()
            .filter_map(|id| parameter_index.get(id).copied())
            .collect(),
        grid: binding.interpolation.map(|_| step_grid.clone()),
        step_grid,
        space: KeyformSpace::new(
            &values,
            binding.parameter_ids.len(),
            binding
                .parameter_ids
                .last()
                .and_then(|id| parameters.get(*parameter_index.get(id)?))
                .and_then(Parameter::repeat_range),
        ),
        influences: crate::influence::BindingInfluence::new(binding, parameter_index, parameters),
        part_entries,
        deformer_entries,
        explicit_parts: binding.target_part_ids.as_ref().map(|ids| {
            ids.iter()
                .filter_map(|id| part_index.get(id).copied())
                .collect()
        }),
        explicit_deformers: binding
            .target_deformer_ids
            .iter()
            .flatten()
            .filter_map(|id| deformer_index.get(id).copied())
            .collect(),
    }
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
        let scene = compile_scene(
            &document.scene_roots(),
            &part_index,
            &mut deformers,
            &mut deformer_index,
        );
        let mut scene_order = Vec::new();
        flatten_scene(&scene, true, &mut scene_order);
        let roots = document.scene_roots();
        let scene_groups = layers::scene_groups(&roots);
        let mut paths: HashMap<&str, GroupPath> = scene_groups.parts.into_iter().collect();
        let groups = layers::compile_groups(&document, &scene_groups.groups);
        let part_ids: Vec<&str> = document.parts.iter().map(|p| p.id.as_str()).collect();
        let visibility = crate::visibility::SceneVisibility::new(
            &roots,
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
            &roots,
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
        let parts = document
            .parts
            .iter()
            .enumerate()
            .map(|(index, part)| CompiledPart {
                rest: part.mesh.vertices.clone(),
                rest_properties: PartProperties::of(part),
                // Only bindings that key this part's vertices in some keyform move them
                // (`getPartBindings`); the rest would add zero deltas.
                vertex_bindings: bindings
                    .iter()
                    .enumerate()
                    .filter(|(_, b)| match &b.explicit_parts {
                        Some(targets) => targets.contains(&index),
                        None => b.part_entries.contains_key(&index),
                    })
                    .filter(|(i, b)| {
                        let keyforms = &document.parameter_bindings[*i].keyforms;
                        b.part_entries.get(&index).is_some_and(|entries| {
                            entries.iter().zip(keyforms).any(|(entry, keyform)| {
                                entry
                                    .and_then(|e| keyform.parts.get(e))
                                    .is_some_and(|p| !p.vertices.is_empty())
                            })
                        })
                    })
                    .map(|(i, _)| i)
                    .collect(),
                property_bindings: bindings
                    .iter()
                    .enumerate()
                    .filter(|(_, b)| {
                        b.explicit_parts
                            .as_ref()
                            .is_some_and(|t| t.contains(&index))
                    })
                    .map(|(i, _)| i)
                    .collect(),
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
        let mut deformer_bindings = vec![Vec::new(); deformers.len()];
        for (index, binding) in bindings.iter().enumerate() {
            for &deformer in &binding.explicit_deformers {
                deformer_bindings[deformer].push(index);
            }
        }
        let mut model = Self {
            geometry_deformers: Vec::new(),
            geometry_cacheable: Vec::new(),
            spatial_parts,
            glue_bindings,
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

fn compile_glue_bindings(document: &Document) -> Vec<Vec<GlueBinding>> {
    let indices: HashMap<&str, usize> = document
        .glue
        .iter()
        .enumerate()
        .map(|(i, g)| (g.id.as_str(), i))
        .collect();
    let mut owners: HashMap<&str, Vec<usize>> = HashMap::new();
    for (i, glue) in document.glue.iter().enumerate() {
        owners.entry(&glue.first.part_id).or_default().push(i);
    }
    let mut result = vec![Vec::new(); document.glue.len()];
    for (b, binding) in document.parameter_bindings.iter().enumerate() {
        let parts: HashSet<&str> = binding
            .target_part_ids
            .as_ref()
            .map(|ids| ids.iter().map(String::as_str).collect())
            .unwrap_or_else(|| {
                binding
                    .keyforms
                    .iter()
                    .flat_map(|f| f.parts.iter().map(|p| p.part_id.as_str()))
                    .collect()
            });
        let mut candidates: HashSet<usize> = parts
            .iter()
            .flat_map(|id| owners.get(id).into_iter().flatten().copied())
            .collect();
        let direct: Vec<&str> = binding
            .target_glue_ids
            .as_ref()
            .map(|ids| ids.iter().map(String::as_str).collect())
            .unwrap_or_else(|| {
                binding
                    .keyforms
                    .iter()
                    .flat_map(|f| f.glue.iter().flatten().map(|g| g.id.as_str()))
                    .collect()
            });
        candidates.extend(direct.into_iter().filter_map(|id| indices.get(id).copied()));
        for index in candidates {
            let glue = &document.glue[index];
            let coordinates: Vec<_> = binding
                .keyforms
                .iter()
                .map(|f| {
                    f.glue
                        .iter()
                        .flatten()
                        .find(|g| g.id == glue.id)
                        .or_else(|| {
                            f.parts
                                .iter()
                                .find(|p| p.part_id == glue.first.part_id)?
                                .glue
                                .as_ref()?
                                .iter()
                                .find(|g| g.id == glue.id)
                        })
                        .map(|g| [g.weight, g.strength])
                })
                .collect();
            if coordinates.iter().any(Option::is_some) {
                result[index].push(GlueBinding {
                    binding: b,
                    coordinates,
                });
            }
        }
    }
    result
}
