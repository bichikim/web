//! Cross-reference rules: scene, skinning, masks, glue, physics, tracks and bindings.

use std::collections::{HashMap, HashSet};

use super::deformer::{keyform_matches, validate_node};
use super::{Check, Index, ensure, is_ratio, known_unique};
use crate::document::{
    DeformerNode, DeformerType, Document, Parameter, Part, Scene, SceneNode, SkinMatrix, Track,
};

const SKIN_WEIGHT_TOLERANCE: f64 = 0.00001;

fn invertible(matrix: &SkinMatrix) -> bool {
    (matrix.xx * matrix.yy - matrix.yx * matrix.xy).abs() >= 0.00000001
}

/// Whether a deformer keeps skin frames for its subtree (`getSkinFrames`): rotation-only,
/// including every preserved binding layout.
pub(crate) fn is_rigid_rotation(node: &DeformerNode) -> bool {
    let rotation = |t: Option<DeformerType>| t == Some(DeformerType::Rotation);
    rotation(node.shape.deformer_type)
        && node.binding.as_ref().is_none_or(|binding| {
            rotation(binding.rest.deformer_type)
                && binding.steps.iter().all(|step| {
                    rotation(step.shape.deformer_type)
                        && step.rest.as_ref().is_none_or(|r| rotation(r.deformer_type))
                })
        })
}

/// Ids of nodes reachable through groups and rigid rotation deformers only, mapped to whether
/// the node is such a deformer.
fn skin_frame_ids(roots: &[SceneNode]) -> HashMap<&str, bool> {
    let mut out = HashMap::new();
    let mut pending: Vec<&SceneNode> = roots.iter().collect();
    while let Some(node) = pending.pop() {
        let rigid = match node {
            // A deforming subtree has no skin frames.
            SceneNode::Deformer(deformer) if !is_rigid_rotation(deformer) => continue,
            SceneNode::Deformer(_) => true,
            SceneNode::Group(_) | SceneNode::Part(_) => false,
        };
        out.insert(node.id(), rigid);
        pending.extend(node.children());
    }
    out
}

/// Node ids, names, part references and deformer shapes, then skinning. Walks with paths of
/// its own, so errors name the node's position.
pub(super) fn validate_scene(scene: &Scene, index: &Index) -> Check {
    let mut node_ids = HashSet::new();
    let mut scene_parts = HashSet::new();
    let mut pending: Vec<(&SceneNode, String)> = scene
        .roots
        .iter()
        .enumerate()
        .map(|(i, n)| (n, format!("scene.roots[{i}]")))
        .collect();
    while let Some((node, path)) = pending.pop() {
        let (id, name) = match node {
            SceneNode::Group(n) => (&n.id, &n.name),
            SceneNode::Deformer(n) => (&n.id, &n.name),
            SceneNode::Part(n) => (&n.id, &n.name),
        };
        ensure(
            !id.is_empty() && !name.is_empty() && node_ids.insert(id.as_str()),
            || path.clone(),
            "needs a unique id and a name",
        )?;
        match node {
            SceneNode::Part(_) => {
                ensure(
                    index.parts.contains_key(id.as_str()),
                    || path.clone(),
                    "references a missing part",
                )?;
                scene_parts.insert(id.as_str());
            }
            SceneNode::Deformer(deformer) => validate_node(deformer, &path)?,
            SceneNode::Group(_) => {}
        }
        for (index, child) in node.children().iter().enumerate() {
            pending.push((child, format!("{path}.children[{index}]")));
        }
    }
    ensure(
        scene_parts.len() == index.parts.len(),
        || "scene".into(),
        "must contain every part once",
    )?;
    validate_skinning(scene, index)
}

fn validate_skinning(scene: &Scene, index: &Index) -> Check {
    let frames = skin_frame_ids(&scene.roots);
    for node in scene.nodes() {
        let SceneNode::Part(part) = node else {
            continue;
        };
        let Some(skin) = &part.skinning else { continue };
        let path = || format!("scene part `{}` skinning", part.id);
        let range_ok = skin.range.is_none_or(|r| (0.25..=3.0).contains(&r));
        ensure(
            frames.contains_key(part.id.as_str())
                && range_ok
                && invertible(&skin.bind)
                && skin.influences.len() >= 2,
            path,
            "needs a rigid ancestor path, an invertible bind and two or more influences",
        )?;
        let count = index
            .parts
            .get(part.id.as_str())
            .map_or(0, |p| p.mesh.vertex_count());
        let mut totals = vec![0.0; count];
        let mut seen = HashSet::new();
        for influence in &skin.influences {
            let strength_ok = influence.strength.is_none_or(|s| (0.5..=1.5).contains(&s));
            ensure(
                strength_ok
                    && seen.insert(influence.node_id.as_str())
                    && invertible(&influence.inverse_bind)
                    && influence.weights.len() == count
                    && frames.get(influence.node_id.as_str()) == Some(&true)
                    && influence.weights.iter().all(|&w| is_ratio(w)),
                path,
                "influences must target rigid rotation deformers with one 0..=1 weight per vertex",
            )?;
            for (total, weight) in totals.iter_mut().zip(&influence.weights) {
                *total += weight;
            }
        }
        ensure(
            totals
                .iter()
                .all(|t| (t - 1.0).abs() < SKIN_WEIGHT_TOLERANCE),
            path,
            "weights must sum to 1 per vertex",
        )?;
    }
    Ok(())
}

pub(super) fn validate_layer_order(document: &Document, index: &Index) -> Check {
    for (position, rule) in document.layer_order_rules.iter().enumerate() {
        // Part and parameter ids are non-empty, so known ids are too.
        ensure(
            known_unique(&rule.part_ids, &index.parts)
                && index.parts.contains_key(rule.reference_part_id.as_str())
                && !rule.part_ids.contains(&rule.reference_part_id)
                && known_unique(&rule.when.parameter_ids, &index.parameters),
            || format!("layerOrderRules[{position}]"),
            "references unknown parts or parameters",
        )?;
    }
    Ok(())
}

pub(super) fn validate_physics(document: &Document, index: &Index) -> Check {
    let Some(physics) = &document.physics else {
        return Ok(());
    };
    let find = |id: &str| index.parameters.get(id);
    let mut ids = HashSet::new();
    let mut outputs = HashSet::new();
    for (index, pendulum) in physics.pendulums.iter().enumerate() {
        let input_range_ok = find(&pendulum.input_parameter_id).is_some_and(|p| {
            [p.minimum - p.default_value, p.maximum - p.default_value]
                .iter()
                .all(|d| (d * pendulum.input_scale).is_finite())
        });
        ensure(
            !pendulum.id.is_empty()
                && ids.insert(pendulum.id.as_str())
                && outputs.insert(pendulum.output_parameter_id.as_str())
                && find(&pendulum.output_parameter_id).is_some()
                && pendulum.input_parameter_id != pendulum.output_parameter_id
                && pendulum.gravity > 0.0
                && pendulum.length > 0.0
                && pendulum.damping >= 0.0
                && (pendulum.gravity / pendulum.length).is_finite()
                && input_range_ok,
            || format!("physics.pendulums[{index}]"),
            "invalid pendulum",
        )?;
    }
    Ok(())
}

/// Visit state of a part in [`validate_masks`]'s depth-first search.
#[derive(Clone, Copy, PartialEq)]
enum Visit {
    New,
    /// On the current search path: reaching it again closes a cycle.
    Open,
    Done,
}

/// Every clipping mask names a part, and no part is (transitively) masked by itself. One
/// iterative depth-first search over the mask graph, so the check is `O(parts + masks)`.
pub(super) fn validate_masks(parts: &[Part]) -> Check {
    let error = |part: &Part| {
        super::FormatError::invalid(
            format!("part `{}` clippingMaskIds", part.id),
            "mask is missing or forms a cycle",
        )
    };
    let positions: HashMap<&str, usize> = parts
        .iter()
        .enumerate()
        .map(|(i, p)| (p.id.as_str(), i))
        .collect();
    let masks = parts
        .iter()
        .map(|part| {
            let ids = part
                .properties
                .as_ref()
                .and_then(|p| p.clipping_mask_ids.as_deref());
            ids.unwrap_or_default()
                .iter()
                .map(|id| {
                    positions
                        .get(id.as_str())
                        .copied()
                        .ok_or_else(|| error(part))
                })
                .collect::<Result<Vec<usize>, _>>()
        })
        .collect::<Result<Vec<_>, _>>()?;
    let mut visits = vec![Visit::New; parts.len()];
    for start in 0..parts.len() {
        if visits[start] != Visit::New {
            continue;
        }
        visits[start] = Visit::Open;
        // Each entry is a part and how many of its masks have been followed.
        let mut path = vec![(start, 0)];
        while let Some((part, followed)) = path.last_mut() {
            let Some(&mask) = masks[*part].get(*followed) else {
                visits[*part] = Visit::Done;
                path.pop();
                continue;
            };
            *followed += 1;
            match visits[mask] {
                Visit::New => {
                    visits[mask] = Visit::Open;
                    path.push((mask, 0));
                }
                Visit::Open => return Err(error(&parts[mask])),
                Visit::Done => {}
            }
        }
    }
    Ok(())
}

pub(super) fn validate_spatial_attachments(document: &Document, index: &Index) -> Check {
    for part in &document.parts {
        let Some(spatial) = &part.spatial else {
            continue;
        };
        let Some(attachments) = &spatial.attachments else {
            continue;
        };
        let mesh = index
            .deformers
            .get(spatial.group_id.as_deref().unwrap_or_default())
            .filter(|d| d.shape.deformer_type == Some(DeformerType::Spatial))
            .and_then(|d| d.spatial_mesh.as_ref());
        ensure(
            mesh.is_some_and(|m| {
                attachments
                    .iter()
                    .all(|a| (a.triangle_index as usize) < m.indices.len() / 3)
            }),
            || format!("part `{}` spatial attachments", part.id),
            "must reference triangles of the group's spatial mesh",
        )?;
    }
    Ok(())
}

/// `resolveParameterValue`: clamps, then snaps to the nearest option.
pub fn resolve_parameter_value(parameter: &Parameter, value: Option<f64>) -> f64 {
    let finite = value
        .filter(|v| v.is_finite())
        .unwrap_or(parameter.default_value);
    let bounded = parameter.bound(finite);
    match &parameter.options {
        Some(options) if !options.is_empty() => {
            options
                .iter()
                .map(|o| o.value)
                .fold(options[0].value, |nearest, v| {
                    if (v - bounded).abs() < (nearest - bounded).abs() {
                        v
                    } else {
                        nearest
                    }
                })
        }
        _ => bounded,
    }
}

/// A model or group-opacity timeline row (`timeline-rows.ts`): `model:<target>` or
/// `group-opacity:<group id>`.
fn is_effect_row(id: &str, groups: &HashSet<&str>) -> bool {
    matches!(id, "model:opacity" | "model:eye-blink" | "model:lip-sync")
        || id
            .strip_prefix("group-opacity:")
            .is_some_and(|group| groups.contains(group))
}

pub(super) fn validate_tracks(document: &Document, index: &Index) -> Check {
    let Index {
        parts,
        parameters,
        group_ids: groups,
        ..
    } = index;
    for motion in &document.motions {
        let path = || format!("motion `{}`", motion.id);
        let parameter_tracks: Vec<&str> = motion
            .tracks
            .iter()
            .filter_map(|t| match t {
                Track::Parameter { parameter_id, .. } => Some(parameter_id.as_str()),
                _ => None,
            })
            .collect();
        ensure(
            super::unique(parameter_tracks.iter().copied()),
            path,
            "duplicate parameter track",
        )?;
        ensure(
            motion
                .timeline_parameter_ids
                .iter()
                .flatten()
                .all(|id| parameters.contains_key(id.as_str()) || is_effect_row(id, groups)),
            path,
            "unknown timeline parameter",
        )?;
        for track in &motion.tracks {
            let ok = match track {
                Track::Parameter {
                    parameter_id,
                    keyframes,
                    ..
                } => parameters.get(parameter_id.as_str()).is_some_and(|p| {
                    // A repeating parameter wraps its maximum, yet a keyframe may sit there to
                    // draw a full turn (`isParameterKeyframeValue`); nothing past the range.
                    keyframes.iter().all(|k| {
                        if p.repeat == Some(true) {
                            (p.minimum..=p.maximum).contains(&k.value)
                        } else {
                            resolve_parameter_value(p, Some(k.value)) == k.value
                        }
                    })
                }),
                Track::Vertex {
                    part_id,
                    vertex_index,
                    ..
                } => parts
                    .get(part_id.as_str())
                    .is_some_and(|p| *vertex_index < p.mesh.vertex_count()),
                // Checked with the model metadata.
                Track::Model { .. } | Track::GroupOpacity { .. } => true,
            };
            ensure(ok, path, "track targets a missing or out-of-range target")?;
        }
    }
    Ok(())
}

pub(super) fn validate_bindings(document: &Document, index: &Index) -> Check {
    let Index {
        parts,
        parameters,
        deformers,
        ..
    } = index;
    for binding in &document.parameter_bindings {
        let path = || format!("binding `{}`", binding.id);
        let influences_ok = binding.influences.iter().flatten().all(|relation| {
            parameters
                .get(relation.parameter_id.as_str())
                .is_some_and(|p| {
                    relation
                        .points
                        .iter()
                        .all(|point| (p.minimum..=p.maximum).contains(&point.value))
                })
        });
        let keyform_values_ok = binding.keyforms.iter().all(|k| {
            k.values
                .iter()
                .zip(&binding.parameter_ids)
                .all(|(value, id)| {
                    parameters
                        .get(id.as_str())
                        .is_some_and(|p| (p.minimum..=p.maximum).contains(value))
                })
        });
        ensure(
            influences_ok
                && keyform_values_ok
                && binding
                    .target_part_ids
                    .iter()
                    .flatten()
                    .all(|id| parts.contains_key(id.as_str()))
                && binding
                    .target_deformer_ids
                    .iter()
                    .flatten()
                    .all(|id| deformers.contains_key(id.as_str())),
            path,
            "references unknown parameters, parts or deformers",
        )?;
        let unbounded = super::is_unbounded(binding);
        let target_parts: Option<HashSet<&str>> = binding
            .target_part_ids
            .as_ref()
            .map(|ids| ids.iter().map(String::as_str).collect());
        let target_deformers: Option<HashSet<&str>> = binding
            .target_deformer_ids
            .as_ref()
            .map(|ids| ids.iter().map(String::as_str).collect());
        for keyform in &binding.keyforms {
            if let Some(targets) = &target_parts {
                ensure(
                    keyform.parts.len() == targets.len()
                        && keyform
                            .parts
                            .iter()
                            .all(|p| targets.contains(p.part_id.as_str())),
                    path,
                    "keyform parts must match targetPartIds",
                )?;
            }
            let keyed = keyform.deformers.as_deref().unwrap_or_default();
            if let Some(targets) = &target_deformers {
                ensure(
                    keyed.len() == targets.len()
                        && keyed.iter().all(|d| targets.contains(d.node_id.as_str())),
                    path,
                    "keyform deformers must match targetDeformerIds",
                )?;
            }
            ensure(
                keyed.iter().all(|d| {
                    deformers
                        .get(d.node_id.as_str())
                        .is_some_and(|node| keyform_matches(d, node, unbounded))
                }),
                path,
                "deformer keyform does not match its node",
            )?;
            ensure(
                keyform.parts.iter().all(|p| {
                    parts.get(p.part_id.as_str()).is_some_and(|part| {
                        p.vertices.is_empty() || p.vertices.len() == part.mesh.vertices.len()
                    })
                }),
                path,
                "part keyform vertices must be empty or match the mesh",
            )?;
        }
    }
    Ok(())
}
