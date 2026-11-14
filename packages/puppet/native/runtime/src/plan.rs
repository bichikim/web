//! Paint order, visibility and resolved properties per frame (`player/internal/render-plan.ts`).

use std::collections::HashMap;
use std::sync::Arc;

use poffo_format::document::{LayerOrderComparison, Placement};
use poffo_format::resolve_parameter_value;

use crate::apply::PosedScene;
use crate::layers::{ColorEffect, LayerPlan, LayerProperties, gather_layers, inherited_effect};
use crate::model::{MaskPlan, Model, PartProperties};
use crate::motion::MotionMix;
use crate::overrides::RenderOverrides;
use crate::spatial::{self, SpatialPartPose};

/// How one part is drawn this frame. Plans are listed in paint order (back to front).
#[derive(Debug, Clone, PartialEq)]
pub struct PartPlan {
    pub part: usize,
    /// Indices into [`crate::Frame::layers`] of the offscreen groups the part is drawn into,
    /// outermost first. Members of a layer are contiguous in paint order.
    pub layers: Arc<[usize]>,
    /// Includes the effect inherited from plain groups.
    pub properties: PartProperties,
    pub mask: Option<Arc<MaskPlan>>,
    /// False for mask sources that are not drawn themselves.
    pub render: bool,
    pub visible: bool,
}

impl Model {
    /// Scene order after the matching layer-order rules, applied in document order.
    fn ordered_parts(&self, values: &[f64]) -> Vec<(usize, bool)> {
        let mut states = self.draw_ordered_parts(values);
        if self.visibility.is_dynamic() {
            let parameters = &self.document.parameters;
            let containers = self.visibility.containers(parameters, values);
            for (part, visible) in &mut states {
                *visible = *visible
                    && self.visibility.part(*part, parameters, values)
                    && self.parts[*part]
                        .path
                        .groups
                        .iter()
                        .all(|&g| containers.get(g).copied().unwrap_or(true));
            }
        }
        for compiled in &self.rules {
            let total: f64 = compiled
                .parameters
                .iter()
                .map(|&p| {
                    resolve_parameter_value(&self.document.parameters[p], values.get(p).copied())
                })
                .sum();
            let when = &compiled.rule.when;
            let matches = match when.comparison {
                LayerOrderComparison::GreaterThan => total > when.threshold,
                LayerOrderComparison::LessThan => total < when.threshold,
            };
            if !matches {
                continue;
            }
            let (selected, remaining): (Vec<_>, Vec<_>) = states
                .into_iter()
                .partition(|(part, _)| compiled.parts.contains(part));
            states = remaining
                .into_iter()
                .flat_map(|state| {
                    if state.0 != compiled.reference {
                        return vec![state];
                    }
                    match compiled.rule.placement {
                        Placement::Before => selected.iter().copied().chain([state]).collect(),
                        Placement::After => [state]
                            .into_iter()
                            .chain(selected.iter().copied())
                            .collect(),
                    }
                })
                .collect();
        }
        states
    }

    /// `getSpatialPartPose` for every spatial part.
    pub(crate) fn spatial_poses(&self, posed: &PosedScene<'_>) -> HashMap<usize, SpatialPartPose> {
        let mut poses = HashMap::new();
        for (index, part) in self.document.parts.iter().enumerate() {
            let Some(surface) = &part.spatial else {
                continue;
            };
            let deformer = surface
                .group_id
                .as_ref()
                .and_then(|id| self.deformer_index.get(id))
                .copied()
                .filter(|&d| self.deformers[d].is_spatial());
            let posed_deformer = deformer.map(|d| &posed.deformers[d]);
            let pose = posed_deformer.and_then(|d| d.spatial.as_ref());
            let control_points =
                deformer
                    .zip(self.spatial_parts.get(&index))
                    .and_then(|(d, statics)| {
                        let node = &self.deformers[d].node;
                        let mesh = node.spatial_mesh.as_ref()?;
                        let rest = node.spatial_mesh_position.unwrap_or([0.0; 3]);
                        let attachments = statics.attachments.as_deref()?;
                        let position = pose.map_or(rest, |p| p.mesh_position);
                        let points = spatial::attached_points(
                            mesh,
                            &statics.sampler,
                            attachments,
                            position,
                            rest,
                        )?;
                        (points.len() == part.mesh.vertices.len() / 2 * 3).then_some(points)
                    });
            let origin = pose.map_or(surface.origin, |p| p.origin);
            let projection = spatial::project(
                control_points.as_deref().unwrap_or(&surface.control_points),
                origin,
                pose,
            );
            poses.insert(
                index,
                spatial::part_pose(projection, &part.mesh.vertices, &part.mesh.indices),
            );
        }
        poses
    }

    /// `getPartRenderFrame`: part plans in paint order and the offscreen groups' plans.
    /// `pose_opacity` multiplies part opacities (indexed like the parts; `None` keeps them).
    pub(crate) fn plan_frame(
        &self,
        values: &[f64],
        poses: &HashMap<usize, SpatialPartPose>,
        (pose_opacity, mix, overrides): (&[Option<f64>], &MotionMix, &RenderOverrides),
    ) -> (Vec<PartPlan>, Vec<LayerPlan>) {
        let states = self.ordered_parts(values);
        let group_of = |part: usize| {
            self.document.parts[part]
                .spatial
                .as_ref()
                .and_then(|s| s.group_id.as_deref())
        };
        let mut groups: HashMap<&str, Vec<(usize, bool)>> = HashMap::new();
        for &state in &states {
            if let Some(group) = group_of(state.0) {
                groups.entry(group).or_default().push(state);
            }
        }
        for group in groups.values_mut() {
            group.sort_by(|a, b| {
                // `+ 0.0` ties -0 with 0 like the web's `a - b` comparator.
                let depth = |p: usize| poses.get(&p).map_or(0.0, |pose| pose.depth + 0.0);
                depth(a.0).total_cmp(&depth(b.0))
            });
            group.reverse();
        }
        let sorted: Vec<(usize, bool)> = states
            .iter()
            .map(|&state| match group_of(state.0) {
                Some(group) => groups.get_mut(group).and_then(Vec::pop).unwrap_or(state),
                None => state,
            })
            .collect();
        let effects: Vec<ColorEffect> = (0..self.groups.len())
            .map(|group| {
                let effect = self.compose_group_effect(group, values);
                let opacity = overrides.groups.get(&group).and_then(|o| o.opacity);
                ColorEffect {
                    opacity: opacity.unwrap_or_else(|| {
                        mix.group_opacity(&self.group_ids[group], effect.opacity)
                    }),
                    ..effect
                }
            })
            .collect();
        let composition = self.document.color_composition;
        let inherited =
            |path: &[usize]| inherited_effect(path, &self.groups, &effects, composition);
        let offscreen = |group: usize| self.groups[group].properties.offscreen;
        // App color overrides of a part or layer: its own, else the nearest plain group's.
        let override_colors = |own, ancestors: &[usize], effect: ColorEffect| ColorEffect {
            multiply_color: overrides
                .color(own, ancestors, offscreen, |o| o.multiply_color)
                .unwrap_or(effect.multiply_color),
            screen_color: overrides
                .color(own, ancestors, offscreen, |o| o.screen_color)
                .unwrap_or(effect.screen_color),
            ..effect
        };
        let layers_of = |(part, _): (usize, bool)| self.parts[part].path.layers.clone();
        let plans = gather_layers(&sorted, &layers_of, 0)
            .into_iter()
            .map(|(part, scene_visible)| {
                let mut properties = self.compose_part_properties(part, values);
                let own = overrides.parts.get(&part);
                if let Some(opacity) = own.and_then(|o| o.opacity) {
                    properties.opacity = opacity;
                } else if let Some(factor) = pose_opacity.get(part).copied().flatten() {
                    properties.opacity *= factor;
                }
                if let Some(culling) = own.and_then(|o| o.culling) {
                    properties.culling = culling;
                }
                // Model opacity scales every part, as Cubism scales every drawable.
                properties.opacity *= mix.model_opacity;
                let compiled = &self.parts[part];
                let effect = ColorEffect {
                    multiply_color: properties.multiply_color,
                    opacity: properties.opacity,
                    screen_color: properties.screen_color,
                }
                .compose(inherited(&compiled.path.groups), composition);
                let effect = override_colors(own, &compiled.path.groups, effect);
                properties.multiply_color = effect.multiply_color;
                properties.opacity = effect.opacity;
                properties.screen_color = effect.screen_color;
                let render = !compiled.used_as_mask || properties.render_when_used_as_mask;
                let facing = self.document.parts[part].spatial.is_none()
                    || poses.get(&part).is_some_and(|p| p.facing);
                PartPlan {
                    part,
                    layers: compiled.path.layers.clone(),
                    properties,
                    mask: compiled.mask.clone(),
                    render,
                    visible: scene_visible && render && facing,
                }
            })
            .collect();
        let containers = self
            .visibility
            .containers(&self.document.parameters, values);
        let shown = |group: &usize| containers.get(*group).copied().unwrap_or(true);
        let layers = self
            .layers
            .iter()
            .map(|layer| {
                let group = &self.groups[layer.group].properties;
                LayerPlan {
                    id: self.group_ids[layer.group].clone(),
                    layers: layer.path.layers.clone(),
                    mask: layer.mask.clone(),
                    properties: LayerProperties {
                        alpha_blend_mode: group.alpha_blend_mode,
                        blend_mode: group.blend_mode,
                        effect: override_colors(
                            overrides.groups.get(&layer.group),
                            &layer.path.groups,
                            effects[layer.group]
                                .compose(inherited(&layer.path.groups), composition),
                        ),
                        inverted_mask: group.inverted_mask,
                    },
                    visible: layer.visible
                        && shown(&layer.group)
                        && layer.path.groups.iter().all(shown),
                }
            })
            .collect();
        (plans, layers)
    }
}
