//! Scene topology compiled to part, deformer and skinning indices.

use crate::deform::{CompiledDeformer, skin::Matrix};
use poffo_format::document::SceneNode;
use std::{collections::HashMap, sync::Arc};

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
        skin: Option<Arc<CompiledSkin>>,
    },
}

pub(super) fn compile_scene(
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
                skin: part.skinning.as_ref().map(|skin| {
                    Arc::new(CompiledSkin {
                        bind: skin.bind.into(),
                        influences: skin
                            .influences
                            .iter()
                            .map(|i| (i.node_id.clone(), i.inverse_bind.into(), i.weights.clone()))
                            .collect(),
                    })
                }),
            },
        })
        .collect()
}

pub(super) fn uses_skinning(nodes: &[SceneTree]) -> bool {
    nodes.iter().any(|node| match node {
        SceneTree::Group { children, .. } | SceneTree::Deformer { children, .. } => {
            uses_skinning(children)
        }
        SceneTree::Part { skin, .. } => skin.is_some(),
    })
}

pub(super) fn flatten_scene(nodes: &[SceneTree], visible: bool, out: &mut Vec<(usize, bool)>) {
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
