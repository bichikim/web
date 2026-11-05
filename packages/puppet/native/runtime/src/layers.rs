//! Group render properties and offscreen layers (`player/internal/scene-layers.ts`).

use std::collections::HashSet;
use std::sync::Arc;

use poffo_format::document::{
    AlphaBlendMode, BlendMode, ColorComposition, DeformerNode, Document, GroupNode, SceneNode,
};

use crate::model::MaskPlan;

/// Opacity and the color effect `c · multiply · (1 − screen) + screen`.
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct ColorEffect {
    pub multiply_color: [f64; 3],
    pub opacity: f64,
    pub screen_color: [f64; 3],
}

impl ColorEffect {
    pub const IDENTITY: Self = Self {
        multiply_color: [1.0; 3],
        opacity: 1.0,
        screen_color: [0.0; 3],
    };

    /// Opacity, multiply color and screen color as one interpolation vector.
    pub(crate) fn coordinates(self) -> [f64; 7] {
        let [m0, m1, m2] = self.multiply_color;
        let [s0, s1, s2] = self.screen_color;
        [self.opacity, m0, m1, m2, s0, s1, s2]
    }

    /// The inverse of [`Self::coordinates`], limited to 0..1.
    pub(crate) fn from_coordinates(c: [f64; 7]) -> Self {
        let unit = |v: f64| v.clamp(0.0, 1.0);
        Self {
            multiply_color: [unit(c[1]), unit(c[2]), unit(c[3])],
            opacity: unit(c[0]),
            screen_color: [unit(c[4]), unit(c[5]), unit(c[6])],
        }
    }

    /// The single effect equal to applying `self` and then `outer` (`composeColorEffects`):
    /// with scale `a = m (1 − s)` and offset `s`, `a = a_self · a_outer` and
    /// `s = s_self · a_outer + s_outer`.
    pub fn then(self, outer: Self) -> Self {
        self.compose(outer, None)
    }

    /// [`Self::then`], or with `Some(ColorComposition::Cubism)` Cubism's independent inheritance:
    /// multiply colors multiply and screen colors combine as `1 − (1 − s_self)(1 − s_outer)`.
    pub fn compose(self, outer: Self, composition: Option<ColorComposition>) -> Self {
        if composition == Some(ColorComposition::Cubism) {
            return Self {
                multiply_color: std::array::from_fn(|i| {
                    self.multiply_color[i] * outer.multiply_color[i]
                }),
                opacity: self.opacity * outer.opacity,
                screen_color: std::array::from_fn(|i| {
                    1.0 - (1.0 - self.screen_color[i]) * (1.0 - outer.screen_color[i])
                }),
            };
        }
        let scale =
            |effect: &Self, i: usize| effect.multiply_color[i] * (1.0 - effect.screen_color[i]);
        let screen_color: [f64; 3] = std::array::from_fn(|i| {
            (self.screen_color[i] * scale(&outer, i) + outer.screen_color[i]).min(1.0)
        });
        Self {
            // The multiply color has no effect once the screen color is white.
            multiply_color: std::array::from_fn(|i| {
                if screen_color[i] < 1.0 {
                    (scale(&self, i) * scale(&outer, i) / (1.0 - screen_color[i])).min(1.0)
                } else {
                    1.0
                }
            }),
            opacity: self.opacity * outer.opacity,
            screen_color,
        }
    }
}

/// Resolved rest properties of a group (`getGroupRenderProperties`).
#[derive(Debug, Clone, PartialEq)]
pub(crate) struct GroupProperties {
    pub(crate) alpha_blend_mode: AlphaBlendMode,
    pub(crate) blend_mode: BlendMode,
    pub(crate) clipping_mask_ids: Vec<String>,
    /// Set for draw order groups; offscreen groups without it sort at the default.
    pub(crate) draw_order: Option<f64>,
    pub(crate) effect: ColorEffect,
    pub(crate) inverted_mask: bool,
    pub(crate) offscreen: bool,
}

impl GroupProperties {
    pub(crate) fn of(group: &GroupNode) -> Self {
        let p = group.properties.clone().unwrap_or_default();
        let base = ColorEffect::IDENTITY;
        Self {
            alpha_blend_mode: p.alpha_blend_mode.unwrap_or_default(),
            blend_mode: p.blend_mode.unwrap_or(BlendMode::Normal),
            clipping_mask_ids: p.clipping_mask_ids.unwrap_or_default(),
            draw_order: p.draw_order,
            effect: ColorEffect {
                multiply_color: p.multiply_color.unwrap_or(base.multiply_color),
                opacity: p.opacity.unwrap_or(base.opacity),
                screen_color: p.screen_color.unwrap_or(base.screen_color),
            },
            inverted_mask: p.inverted_mask.unwrap_or(false),
            offscreen: p.offscreen.unwrap_or(false),
        }
    }
}

impl GroupProperties {
    /// A deformer's opacity and colors as the properties of a plain group: it passes them to
    /// everything inside it, as Cubism deformers do (`getDeformerRenderProperties`).
    pub(crate) fn of_deformer(deformer: &DeformerNode) -> Self {
        let p = deformer.properties.clone().unwrap_or_default();
        let base = ColorEffect::IDENTITY;
        Self {
            alpha_blend_mode: AlphaBlendMode::default(),
            blend_mode: BlendMode::Normal,
            clipping_mask_ids: Vec::new(),
            draw_order: None,
            effect: ColorEffect {
                multiply_color: p.multiply_color.unwrap_or(base.multiply_color),
                opacity: p.opacity.unwrap_or(base.opacity),
                screen_color: p.screen_color.unwrap_or(base.screen_color),
            },
            inverted_mask: false,
            offscreen: false,
        }
    }
}

/// A scene container whose opacity and colors its contents inherit.
#[derive(Debug, Clone, Copy)]
pub(crate) enum EffectContainer<'a> {
    Group(&'a GroupNode),
    Deformer(&'a DeformerNode),
}

impl<'a> EffectContainer<'a> {
    pub(crate) fn id(self) -> &'a str {
        match self {
            Self::Group(group) => &group.id,
            Self::Deformer(deformer) => &deformer.id,
        }
    }
}

/// How an offscreen group's layer is composited over the pixels behind it.
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct LayerProperties {
    pub alpha_blend_mode: AlphaBlendMode,
    pub blend_mode: BlendMode,
    /// Includes the effect inherited from the plain groups above the layer.
    pub effect: ColorEffect,
    pub inverted_mask: bool,
}

/// An offscreen group this frame. Its members are drawn into a transparent layer first.
#[derive(Debug, Clone, PartialEq)]
pub struct LayerPlan {
    pub id: String,
    /// Indices of the layers this one is drawn into, outermost first.
    pub layers: Arc<[usize]>,
    pub mask: Option<Arc<MaskPlan>>,
    pub properties: LayerProperties,
    /// Visible together with every container above it.
    pub visible: bool,
}

/// Where a part or layer sits among the scene containers.
#[derive(Debug, Clone, PartialEq)]
pub(crate) struct GroupPath {
    /// Group and deformer indices, outermost first.
    pub(crate) groups: Arc<[usize]>,
    /// Offscreen layer indices, outermost first.
    pub(crate) layers: Arc<[usize]>,
}

impl GroupPath {
    pub(crate) fn root() -> Self {
        Self {
            groups: Arc::from([]),
            layers: Arc::from([]),
        }
    }
}

/// A scene group or deformer with the bindings keying its opacity and colors.
#[derive(Debug, Clone)]
pub(crate) struct CompiledGroup {
    pub(crate) properties: GroupProperties,
    /// Keyed through each keyform's `deformers` rather than its `groups`.
    pub(crate) deformer: bool,
    /// `(binding, index into each keyform's groups or deformers)` for bindings targeting this
    /// container.
    pub(crate) bindings: Vec<(usize, Vec<Option<usize>>)>,
}

/// Each container's rest properties and the bindings listing it in `targetGroupIds` or
/// `targetDeformerIds`.
pub(crate) fn compile_groups(
    document: &Document,
    containers: &[EffectContainer<'_>],
) -> Vec<CompiledGroup> {
    containers
        .iter()
        .map(|&container| {
            let id = container.id();
            let deformer = matches!(container, EffectContainer::Deformer(_));
            let bindings = document
                .parameter_bindings
                .iter()
                .enumerate()
                .filter(|(_, b)| {
                    let targets = if deformer {
                        &b.target_deformer_ids
                    } else {
                        &b.target_group_ids
                    };
                    targets.iter().flatten().any(|target| target == id)
                })
                .map(|(index, b)| {
                    let entries = b
                        .keyforms
                        .iter()
                        .map(|k| {
                            if deformer {
                                k.deformers.iter().flatten().position(|e| e.node_id == id)
                            } else {
                                k.groups.iter().flatten().position(|e| e.group_id == id)
                            }
                        })
                        .collect();
                    (index, entries)
                })
                .collect();
            CompiledGroup {
                properties: match container {
                    EffectContainer::Group(group) => GroupProperties::of(group),
                    EffectContainer::Deformer(node) => GroupProperties::of_deformer(node),
                },
                deformer,
                bindings,
            }
        })
        .collect()
}

/// An offscreen group: the group, its ancestors and whether every container above shows it.
#[derive(Debug, Clone)]
pub(crate) struct CompiledLayer {
    pub(crate) group: usize,
    pub(crate) path: GroupPath,
    pub(crate) visible: bool,
    pub(crate) mask: Option<Arc<MaskPlan>>,
}

/// Groups and deformers in scene order with each part's and offscreen group's path.
pub(crate) struct SceneGroups<'a> {
    pub(crate) groups: Vec<EffectContainer<'a>>,
    pub(crate) parts: Vec<(&'a str, GroupPath)>,
    /// `(group, ancestors' path, visible)` per offscreen group, in scene order.
    pub(crate) layers: Vec<(usize, GroupPath, bool)>,
}

pub(crate) fn scene_groups(roots: &[SceneNode]) -> SceneGroups<'_> {
    let mut out = SceneGroups {
        groups: Vec::new(),
        parts: Vec::new(),
        layers: Vec::new(),
    };
    walk(roots, &GroupPath::root(), true, &mut out);
    out
}

fn walk<'a>(nodes: &'a [SceneNode], path: &GroupPath, visible: bool, out: &mut SceneGroups<'a>) {
    for node in nodes {
        let visible = visible && node.visible();
        match node {
            SceneNode::Part(part) => out.parts.push((&part.id, path.clone())),
            SceneNode::Deformer(deformer) => {
                let index = out.groups.len();
                out.groups.push(EffectContainer::Deformer(deformer));
                let inner = GroupPath {
                    groups: path.groups.iter().copied().chain([index]).collect(),
                    layers: path.layers.clone(),
                };
                walk(&deformer.children, &inner, visible, out);
            }
            SceneNode::Group(group) => {
                let index = out.groups.len();
                out.groups.push(EffectContainer::Group(group));
                let layers = if GroupProperties::of(group).offscreen {
                    out.layers.push((index, path.clone(), visible));
                    path.layers
                        .iter()
                        .copied()
                        .chain([out.layers.len() - 1])
                        .collect()
                } else {
                    path.layers.clone()
                };
                let inner = GroupPath {
                    groups: path.groups.iter().copied().chain([index]).collect(),
                    layers,
                };
                walk(&group.children, &inner, visible, out);
            }
        }
    }
}

/// The effect of the plain groups and deformers on `path` below its innermost offscreen group, folded from
/// the outermost inwards (`inheritGroupEffects`): a plain group's effect applies after
/// everything inside it, and an offscreen group starts a layer whose content inherits nothing.
pub(crate) fn inherited_effect(
    path: &[usize],
    groups: &[CompiledGroup],
    effects: &[ColorEffect],
    composition: Option<ColorComposition>,
) -> ColorEffect {
    path.iter()
        .fold(ColorEffect::IDENTITY, |inherited, &group| {
            if groups[group].properties.offscreen {
                ColorEffect::IDENTITY
            } else {
                effects[group].compose(inherited, composition)
            }
        })
}

/// Moves the members of each layer, recursively, to the position of the first one so that
/// every layer paints contiguously; relative order is kept (`gatherLayers`).
pub(crate) fn gather_layers<T: Copy>(
    items: &[T],
    layers_of: &impl Fn(T) -> Arc<[usize]>,
    depth: usize,
) -> Vec<T> {
    let mut gathered = HashSet::new();
    let mut out = Vec::with_capacity(items.len());
    for &item in items {
        match layers_of(item).get(depth).copied() {
            None => out.push(item),
            Some(layer) if gathered.insert(layer) => {
                let members: Vec<T> = items
                    .iter()
                    .copied()
                    .filter(|&candidate| layers_of(candidate).get(depth) == Some(&layer))
                    .collect();
                out.extend(gather_layers(&members, layers_of, depth + 1));
            }
            Some(_) => {}
        }
    }
    out
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn composed_effects_equal_applying_both() {
        let inner = ColorEffect {
            multiply_color: [0.5, 1.0, 0.2],
            opacity: 0.5,
            screen_color: [0.25, 0.0, 0.5],
        };
        let outer = ColorEffect {
            multiply_color: [0.8, 0.5, 1.0],
            opacity: 0.4,
            screen_color: [0.5, 0.1, 0.0],
        };
        let apply = |e: &ColorEffect, c: f64, i: usize| {
            c * e.multiply_color[i] * (1.0 - e.screen_color[i]) + e.screen_color[i]
        };
        let composed = inner.then(outer);
        assert!((composed.opacity - 0.2).abs() < 1e-12);
        for c in [0.0, 0.3, 1.0] {
            for i in 0..3 {
                assert!(
                    (apply(&composed, c, i) - apply(&outer, apply(&inner, c, i), i)).abs() < 1e-12
                );
            }
        }
    }

    #[test]
    fn cubism_composition_inherits_multiply_and_screen_independently() {
        // `composeColorEffects(inner, outer, 'cubism')`.
        let inner = ColorEffect {
            multiply_color: [0.5, 1.0, 0.2],
            opacity: 0.5,
            screen_color: [0.25, 0.0, 0.5],
        };
        let outer = ColorEffect {
            multiply_color: [0.8, 0.5, 1.0],
            opacity: 0.4,
            screen_color: [0.5, 0.1, 0.0],
        };
        let composed = inner.compose(outer, Some(ColorComposition::Cubism));
        let close = |a: [f64; 3], b: [f64; 3]| a.iter().zip(b).all(|(a, b)| (a - b).abs() < 1e-12);
        assert!(close(composed.multiply_color, [0.4, 0.5, 0.2]));
        assert!(close(composed.screen_color, [0.625, 0.1, 0.5]));
        assert!((composed.opacity - 0.2).abs() < 1e-12);
        assert_eq!(inner.compose(outer, None), inner.then(outer));
    }

    #[test]
    fn layers_paint_contiguously_at_their_first_member() {
        let layers: [&[usize]; 5] = [&[0], &[], &[0, 1], &[0], &[0, 1]];
        let of = |i: usize| Arc::from(layers[i]);
        assert_eq!(gather_layers(&[2, 1, 0, 4, 3], &of, 0), [2, 4, 0, 3, 1]);
    }
}
