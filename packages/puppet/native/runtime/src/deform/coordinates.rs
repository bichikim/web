//! Dense fallback and demand-driven grid coordinates. Materialization is reserved for layouts
//! that require a complete slice; ordinary grid sampling reads just its requested corners.
use crate::pose_cache::GridView;
use std::{cell::OnceCell, ops::Deref};

#[derive(Clone)]
pub(crate) struct Coordinates<'a> {
    dense: OnceCell<Vec<f64>>,
    length: usize,
    sample: Option<GridView<'a>>,
}
impl std::fmt::Debug for Coordinates<'_> {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.debug_struct("Coordinates")
            .field("length", &self.length)
            .finish_non_exhaustive()
    }
}
impl<'a> Coordinates<'a> {
    pub(crate) fn dense(points: Vec<f64>) -> Self {
        let length = points.len();
        Self {
            dense: OnceCell::from(points),
            length,
            sample: None,
        }
    }
    pub(crate) fn grid(length: usize, view: GridView<'a>) -> Self {
        Self {
            dense: OnceCell::new(),
            length,
            sample: Some(view),
        }
    }
    pub(crate) fn len(&self) -> usize {
        self.length
    }
    #[inline]
    pub(crate) fn at(&self, index: usize) -> f64 {
        if index >= self.length {
            return 0.0;
        }
        match self.dense.get() {
            Some(points) => points[index],
            None => self
                .sample
                .as_ref()
                .expect("grid coordinates")
                .coordinate(index),
        }
    }
}
impl Deref for Coordinates<'_> {
    type Target = [f64];
    fn deref(&self) -> &Self::Target {
        self.dense
            .get_or_init(|| (0..self.length).map(|i| self.at(i)).collect())
    }
}
