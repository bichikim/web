//! Shared clipping plans and their iterative compilation and ownership.

use super::PartProperties;
use poffo_format::document::Document;
use std::collections::HashMap;
use std::sync::Arc;

/// Clip sources of a masked part; each source may itself be masked.
///
/// Plans nest as deep as a document's mask chains, which validation does not limit, so
/// equality, `Debug` and dropping walk them without recursion. Within one [`super::Model`], equal plans
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

/// A plan's sources with each nested plan by address: interned plans are equal exactly when
/// their keys are.
type SourcesKey = Vec<(usize, bool, Option<*const MaskPlan>)>;

/// Builds each part's clip plan once, sharing it with every plan that uses the part as a source
/// and with every equal plan. Works with an explicit stack: chains can be arbitrarily deep.
pub(super) struct MaskPlans<'d> {
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
    pub(super) fn new(document: &'d Document, part_index: &'d HashMap<String, usize>) -> Self {
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
    pub(super) fn part(&mut self, root: usize) -> Option<Arc<MaskPlan>> {
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
    pub(super) fn sources(&mut self, ids: &[String]) -> Option<Arc<MaskPlan>> {
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
