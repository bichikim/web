//! Parameter composition: part vertices and properties, glue and deformer poses.

use poffo_format::document::{CurveHandle, DeformerType, Glue, PartKeyformProperties, Point};
use poffo_format::resolve_parameter_value;

use crate::deform::{PosedDeformer, RotationPose, SpatialPose};
use crate::geometry::wrap_angle;
use crate::keyform::{KeyformSample, blend};
use crate::layers::ColorEffect;
use crate::model::{CompiledBinding, Model, PartProperties};

/// Parameter values indexed like `Document::parameters`.
pub type ParameterValues = [f64];

impl Model {
    /// The binding's resolved parameter values per axis, 0 past its parameters
    /// (`getParameterBindingValues`).
    fn binding_coordinates(&self, binding: &CompiledBinding, values: &ParameterValues) -> [f64; 3] {
        [0, 1, 2].map(|axis| {
            binding.parameters.get(axis).map_or(0.0, |&p| {
                resolve_parameter_value(&self.document.parameters[p], values.get(p).copied())
            })
        })
    }

    /// The binding's position in keyform space.
    pub(crate) fn binding_sample(
        &self,
        binding: &CompiledBinding,
        values: &ParameterValues,
    ) -> Option<KeyformSample> {
        let values = self.binding_coordinates(binding, values);
        match &binding.grid {
            Some(grid) => Some(KeyformSample::Grid(grid.locate(values, false))),
            None => binding.space.locate(values),
        }
    }

    /// The binding's influence-curve weight (`getBindingInfluence`).
    pub(crate) fn binding_influence(
        &self,
        binding: &CompiledBinding,
        values: &ParameterValues,
    ) -> f64 {
        binding
            .influences
            .weight(&self.document.parameters, values, false)
    }

    /// `composeParameterVertices`: rest vertices plus each binding's weighted keyform delta.
    pub(crate) fn compose_part_vertices(&self, part: usize, values: &ParameterValues) -> Vec<f64> {
        let rest = &self.parts[part].rest;
        let mut composed = rest.clone();
        for &b in &self.parts[part].vertex_bindings {
            let binding = &self.bindings[b];
            let Some(sample) = self.binding_sample(binding, values) else {
                continue;
            };
            let keyforms = &self.document.parameter_bindings[b].keyforms;
            let entries = binding.part_entries.get(&part);
            let coordinates = |k: usize| {
                let entry = entries?.get(k).copied().flatten()?;
                let vertices = &keyforms[k].parts[entry].vertices;
                (!vertices.is_empty()).then_some(vertices.as_slice())
            };
            let sampled = blend(sample, coordinates, rest);
            let weight = self.binding_influence(binding, values);
            for ((current, &rest), &sampled) in
                composed.iter_mut().zip(rest.iter()).zip(sampled.iter())
            {
                *current += (sampled - rest) * weight;
            }
        }
        composed
    }

    /// Rest opacity and colors moved by each `(binding, keyed coordinates per keyform)`: the
    /// sampled offset from rest, weighted by influence, summed and limited to 0..1
    /// (`composeKeyedColorEffect`). A keyform without properties keeps the rest values.
    fn compose_effect(
        &self,
        rest: ColorEffect,
        keyed: impl Iterator<Item = (usize, Vec<Option<[f64; 7]>>)>,
        values: &ParameterValues,
    ) -> ColorEffect {
        let rest_coordinates = rest.coordinates();
        let mut coordinates = rest_coordinates;
        for (b, keyed) in keyed {
            // A binding whose keyforms all keep the rest values adds nothing; skipping it keeps
            // the rest values exact (`createColorEffectComposer`).
            if keyed.iter().flatten().all(|c| *c == rest_coordinates) {
                continue;
            }
            let binding = &self.bindings[b];
            let Some(sample) = self.binding_sample(binding, values) else {
                continue;
            };
            let sampled = blend(
                sample,
                |k| keyed.get(k)?.as_ref().map(|c| &c[..]),
                &rest_coordinates,
            );
            let weight = self.binding_influence(binding, values);
            for (index, coordinate) in coordinates.iter_mut().enumerate() {
                let value = sampled
                    .get(index)
                    .copied()
                    .unwrap_or(rest_coordinates[index]);
                *coordinate += (value - rest_coordinates[index]) * weight;
            }
        }
        ColorEffect::from_coordinates(coordinates)
    }

    /// `composeParameterPartProperties`: opacity and colors keyed by explicit targets.
    pub(crate) fn compose_part_properties(
        &self,
        part: usize,
        values: &ParameterValues,
    ) -> PartProperties {
        let rest = self.parts[part].rest_properties;
        let rest_effect = ColorEffect {
            multiply_color: rest.multiply_color,
            opacity: rest.opacity,
            screen_color: rest.screen_color,
        };
        let entries = self.parts[part].property_bindings.iter().map(|&b| {
            let keyforms = &self.document.parameter_bindings[b].keyforms;
            let entries = self.bindings[b].part_entries.get(&part);
            let keyed = (0..keyforms.len())
                .map(|k| {
                    let entry = entries?.get(k).copied().flatten()?;
                    let p = keyforms[k].parts[entry].properties.as_ref()?;
                    Some(keyed_coordinates(p, rest_effect))
                })
                .collect();
            (b, keyed)
        });
        let effect = self.compose_effect(rest_effect, entries, values);
        PartProperties {
            multiply_color: effect.multiply_color,
            opacity: effect.opacity,
            screen_color: effect.screen_color,
            ..rest
        }
    }

    /// `composeParameterGroupProperties` and `composeParameterDeformerProperties`: a group's or
    /// deformer's opacity and colors keyed by bindings listing it in `targetGroupIds` or
    /// `targetDeformerIds`.
    pub(crate) fn compose_group_effect(
        &self,
        group: usize,
        values: &ParameterValues,
    ) -> ColorEffect {
        let compiled = &self.groups[group];
        let rest = compiled.properties.effect;
        let entries = compiled.bindings.iter().map(|(b, entries)| {
            let keyforms = &self.document.parameter_bindings[*b].keyforms;
            let keyed = keyforms
                .iter()
                .zip(entries)
                .map(|(keyform, entry)| {
                    let entry = (*entry)?;
                    if compiled.deformer {
                        // A deformer entry without properties keeps the rest values.
                        let p = keyform
                            .deformers
                            .as_ref()?
                            .get(entry)?
                            .properties
                            .as_ref()?;
                        let p = PartKeyformProperties {
                            draw_order: None,
                            multiply_color: p.multiply_color,
                            opacity: p.opacity,
                            screen_color: p.screen_color,
                        };
                        return Some(keyed_coordinates(&p, rest));
                    }
                    let p = &keyform.groups.as_ref()?.get(entry)?.properties;
                    Some(keyed_coordinates(p, rest))
                })
                .collect();
            (*b, keyed)
        });
        self.compose_effect(rest, entries, values)
    }

    /// `composeParameterGlue`: keyed weight and strength per connection.
    pub(crate) fn compose_glue(&self, values: &ParameterValues) -> Vec<Glue> {
        self.document
            .glue
            .iter()
            .enumerate()
            .map(|(index, glue)| {
                let mut weight = glue.weight;
                let mut strength = glue.strength;
                for compiled in &self.glue_bindings[index] {
                    let binding = &self.bindings[compiled.binding];
                    let Some(sample) = self.binding_sample(binding, values) else {
                        continue;
                    };
                    let keyed = &compiled.coordinates;
                    let rest = [glue.weight, glue.strength];
                    let sampled = blend(sample, |k| keyed[k].as_ref().map(|c| &c[..]), &rest);
                    let influence = self.binding_influence(binding, values);
                    weight += (sampled[0] - glue.weight) * influence;
                    strength += (sampled[1] - glue.strength) * influence;
                }
                Glue {
                    strength: strength.clamp(0.0, 1.0),
                    weight: if glue.second.edge.is_some() {
                        1.0
                    } else {
                        weight.clamp(0.0, 1.0)
                    },
                    ..glue.clone()
                }
            })
            .collect()
    }

    /// `composeParameterDeformer`: the deformer's control points, handles and spatial channels.
    pub(crate) fn pose_deformer(
        &self,
        index: usize,
        values: &ParameterValues,
    ) -> PosedDeformer<'_> {
        let compiled = &self.deformers[index];
        let node = &compiled.node;
        let rest_handles = node.shape.curve_handles.as_deref();
        let handle_coordinates = |handles: Option<&[CurveHandle]>| -> Vec<f64> {
            rest_handles
                .into_iter()
                .flatten()
                .flat_map(|rest| {
                    let h = handles
                        .and_then(|hs| hs.iter().find(|c| c.point_index == rest.point_index))
                        .unwrap_or(rest);
                    [h.horizontal.x, h.horizontal.y, h.vertical.x, h.vertical.y]
                })
                .collect()
        };
        let spatial = compiled.is_spatial();
        let spatial_rest = SpatialPose {
            mesh_position: node.spatial_mesh_position.unwrap_or([0.0; 3]),
            origin: node.spatial_origin.unwrap_or([0.0; 3]),
            rotation: node.spatial_rotation.unwrap_or([0.0; 3]),
            scale: node.spatial_scale.unwrap_or([1.0; 3]),
            translation: node.spatial_translation.unwrap_or([0.0; 3]),
        };
        let rest_channels =
            compiled.channels_with_angle(&node.shape.control_points, node.shape.rotation_angle);
        let rest_handle_coordinates = handle_coordinates(rest_handles);
        let mut channels = rest_channels.clone();
        let mut handle_values = rest_handle_coordinates.clone();
        let mut spatial_values = spatial_rest;
        let rotation = node.shape.deformer_type == Some(DeformerType::Rotation);
        // `getRotationAngle`: a deformer with an unwrapped angle derives it from its channels.
        let rest_angle = compiled.rest_angle();
        let sampled_angle = |channels: &[f64]| {
            node.shape
                .rotation_angle
                .map(|_| channels.get(2).copied().unwrap_or(0.0) + rest_angle)
        };
        let rest_scale = [node.shape.rotation_scale.unwrap_or(1.0)];
        let mut rotation_scale = rest_scale;
        let rest_reflection = node
            .shape
            .rotation_reflection
            .unwrap_or([false; 2])
            .map(|v| f64::from(u8::from(v)));
        let mut reflection = rest_reflection;

        for &b in &self.deformer_bindings[index] {
            let binding = &self.bindings[b];
            let Some(sample) = self.binding_sample(binding, values) else {
                continue;
            };
            let keyforms = &self.document.parameter_bindings[b].keyforms;
            let entries = binding.deformer_entries.get(&index);
            let keyed: Vec<Option<&poffo_format::document::ParameterDeformerKeyform>> = keyforms
                .iter()
                .enumerate()
                .map(|(k, form)| {
                    form.deformers
                        .as_ref()?
                        .get(entries?.get(k).copied().flatten()?)
                })
                .collect();
            let keyform_channels: Vec<Option<std::borrow::Cow<'_, [f64]>>> = keyed
                .iter()
                .map(|d| {
                    d.map(|d| {
                        if node.shape.bone_rest_points.is_none() && d.rotation_angle.is_none() {
                            std::borrow::Cow::Borrowed(d.control_points.as_slice())
                        } else {
                            std::borrow::Cow::Owned(
                                compiled
                                    .channels_with_angle(&d.control_points, d.rotation_angle)
                                    .into_iter()
                                    .enumerate()
                                    .map(|(axis, value)| {
                                        if axis < 2
                                            || node.shape.bone_rest_points.is_none()
                                            || d.rotation_angle.is_some()
                                        {
                                            value
                                        } else {
                                            let center = rest_channels[axis];
                                            center + wrap_angle(value - center)
                                        }
                                    })
                                    .collect(),
                            )
                        }
                    })
                })
                .collect();
            // `createSampledDeformer` re-poses bone channels before they are converted back.
            let sampled_channels =
                blend(sample, |k| keyform_channels[k].as_deref(), &rest_channels);
            let sampled_channels = compiled.channels_with_angle(
                &compiled.control_points_from_channels(&sampled_channels),
                sampled_angle(&sampled_channels),
            );
            let keyform_handles: Vec<Vec<f64>> = keyed
                .iter()
                .map(|d| handle_coordinates(d.and_then(|d| d.curve_handles.as_deref())))
                .collect();
            let sampled_handles = blend(
                sample,
                |k| Some(keyform_handles[k].as_slice()),
                &rest_handle_coordinates,
            );
            let weight = self.binding_influence(binding, values);
            add_delta(&mut channels, &sampled_channels, &rest_channels, weight);
            add_delta(
                &mut handle_values,
                &sampled_handles,
                &rest_handle_coordinates,
                weight,
            );
            if rotation {
                // Missing keyed scales preserve the base deformer scale.
                let scales: Vec<[f64; 1]> = keyed
                    .iter()
                    .map(|d| [d.and_then(|d| d.rotation_scale).unwrap_or(rest_scale[0])])
                    .collect();
                let sampled = blend(sample, |k| scales.get(k).map(|s| &s[..]), &rest_scale);
                add_delta(&mut rotation_scale, &sampled, &rest_scale, weight);
                let flags: Vec<[f64; 2]> = keyed
                    .iter()
                    .map(|d| {
                        d.and_then(|d| d.rotation_reflection)
                            .unwrap_or(node.shape.rotation_reflection.unwrap_or([false; 2]))
                            .map(|v| f64::from(u8::from(v)))
                    })
                    .collect();
                let coordinates = self.binding_coordinates(binding, values);
                let sample = KeyformSample::Grid(binding.step_grid.locate(coordinates, true));
                let sampled = blend(sample, |k| flags.get(k).map(|s| &s[..]), &rest_reflection);
                let sampled = sampled
                    .iter()
                    .map(|v| f64::from(u8::from(*v > 0.0)))
                    .collect::<Vec<_>>();
                // Discrete channels weigh by the influence sampled as a step.
                let step_weight =
                    binding
                        .influences
                        .weight(&self.document.parameters, values, true);
                add_delta(&mut reflection, &sampled, &rest_reflection, step_weight);
            }
            if spatial {
                let sample_axis = |pick: fn(
                    &poffo_format::document::ParameterDeformerKeyform,
                ) -> Option<[f64; 3]>,
                                   rest: [f64; 3]| {
                    let keyed: Vec<Option<[f64; 3]>> =
                        keyed.iter().map(|d| d.and_then(pick)).collect();
                    let sampled = blend(
                        sample,
                        |k| Some(keyed[k].as_ref().map_or(&rest[..], |c| &c[..])),
                        &rest,
                    );
                    [0, 1, 2].map(|i| sampled.get(i).copied().unwrap_or(rest[i]))
                };
                let s = &mut spatial_values;
                let r = spatial_rest;
                add_delta(
                    &mut s.mesh_position,
                    &sample_axis(|d| d.spatial_mesh_position, r.mesh_position),
                    &r.mesh_position,
                    weight,
                );
                add_delta(
                    &mut s.origin,
                    &sample_axis(|d| d.spatial_origin, r.origin),
                    &r.origin,
                    weight,
                );
                add_delta(
                    &mut s.rotation,
                    &sample_axis(|d| d.spatial_rotation, r.rotation),
                    &r.rotation,
                    weight,
                );
                add_delta(
                    &mut s.scale,
                    &sample_axis(|d| d.spatial_scale, r.scale),
                    &r.scale,
                    weight,
                );
                add_delta(
                    &mut s.translation,
                    &sample_axis(|d| d.spatial_translation, r.translation),
                    &r.translation,
                    weight,
                );
            }
        }

        let handle_list = rest_handles.map(|handles| {
            handles
                .iter()
                .enumerate()
                .map(|(i, rest)| {
                    let at = |offset: usize, fallback: f64| {
                        handle_values
                            .get(i * 4 + offset)
                            .copied()
                            .unwrap_or(fallback)
                    };
                    CurveHandle {
                        horizontal: Point {
                            x: at(0, rest.horizontal.x),
                            y: at(1, rest.horizontal.y),
                        },
                        point_index: rest.point_index,
                        vertical: Point {
                            x: at(2, rest.vertical.x),
                            y: at(3, rest.vertical.y),
                        },
                    }
                })
                .collect()
        });
        let spatial_pose =
            (node.shape.deformer_type == Some(DeformerType::Spatial)).then_some(spatial_values);
        PosedDeformer::new(
            compiled,
            compiled.control_points_from_channels(&channels),
            handle_list,
            spatial_pose,
            RotationPose {
                // Bindings add their scale offsets; the sum stops at zero rather than mirroring.
                scale: rotation_scale[0].max(0.0),
                reflection: reflection.map(|v| v > 0.0),
                angle: sampled_angle(&channels),
            },
        )
    }
}

fn add_delta(current: &mut [f64], sampled: &[f64], rest: &[f64], weight: f64) {
    for (index, value) in current.iter_mut().enumerate() {
        let rest = rest[index];
        *value += (sampled.get(index).copied().unwrap_or(rest) - rest) * weight;
    }
}

/// A keyform's opacity and colors as coordinates, falling back to `rest`.
fn keyed_coordinates(p: &PartKeyformProperties, rest: ColorEffect) -> [f64; 7] {
    ColorEffect {
        multiply_color: p.multiply_color.unwrap_or(rest.multiply_color),
        opacity: p.opacity.unwrap_or(rest.opacity),
        screen_color: p.screen_color.unwrap_or(rest.screen_color),
    }
    .coordinates()
}
