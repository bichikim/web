//! Parameter and Glue keyforms compiled to indexed channels.

use super::{CompiledBinding, GlueBinding};
use crate::keyform::KeyformSpace;
use poffo_format::document::{Document, Parameter, ParameterBinding};
use std::collections::{HashMap, HashSet};

pub(super) fn compile_binding(
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

pub(super) fn compile_glue_bindings(document: &Document) -> Vec<Vec<GlueBinding>> {
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
