//! Owned geometry completion on a rendering thread, preserving CPU corrections and Glue.
use crate::{
    apply::apply_glue, deferred::Job, deform::projection::Projection, geometry::Vec2,
    model::GlueConnection,
};
use poffo_format::document::{GlueEdge, GlueMode, GlueRotation};
use std::ops::Range;

pub(crate) fn encode_layout(
    lengths: impl IntoIterator<Item = usize>,
    glue: &[GlueConnection],
) -> Vec<f64> {
    let lengths: Vec<_> = lengths.into_iter().collect();
    let mut out = vec![1., lengths.len() as f64, glue.len() as f64];
    out.extend(lengths.iter().map(|&length| length as f64));
    for g in glue {
        let mode = match g.mode {
            None => 0.,
            Some(GlueMode::Vertex) => 1.,
            Some(GlueMode::Translate) => 2.,
            Some(GlueMode::Rigid) => 3.,
        };
        out.extend([
            g.first_part as f64,
            g.second_part as f64,
            g.first_offset as f64,
            g.second_offset as f64,
            mode,
            g.edge.map_or(-1., |e| e.end_index as f64),
            g.edge.map_or(0., |e| e.position),
            g.rotation.map_or(-1., |r| r.first as f64),
            g.rotation.map_or(0., |r| r.second as f64),
            g.weight,
            g.strength,
        ]);
    }
    out
}
pub(crate) fn encode_frame(out: &mut Vec<f64>, jobs: &[Job], changes: &[(usize, f64, f64)]) {
    out.clear();
    out.extend([jobs.len() as f64, 0.]);
    for job in jobs {
        let p = &job.projection;
        out.extend([
            job.part as f64,
            job.start as f64,
            job.count as f64,
            p.kind as f64,
            p.values.len() as f64,
        ]);
        out.extend_from_slice(&p.values);
    }
    for &(index, weight, strength) in changes {
        out.extend([index as f64, weight, strength]);
    }
    out[1] = changes.len() as f64;
}
struct Cursor<'a> {
    values: &'a [f64],
}
impl<'a> Cursor<'a> {
    fn take(&mut self, count: usize) -> Result<&'a [f64], String> {
        if count > self.values.len() {
            return Err("Truncated geometry packet".into());
        }
        let (head, tail) = self.values.split_at(count);
        self.values = tail;
        Ok(head)
    }
    fn number(&mut self) -> Result<f64, String> {
        let value = self.take(1)?[0];
        if !value.is_finite() {
            return Err("Non-finite geometry packet".into());
        }
        Ok(value)
    }
    fn index(&mut self) -> Result<usize, String> {
        let value = self.number()?;
        if value < 0. || value.fract() != 0. || value >= usize::MAX as f64 {
            return Err("Invalid geometry index".into());
        }
        Ok(value as usize)
    }
    fn done(&self) -> Result<(), String> {
        if self.values.is_empty() {
            Ok(())
        } else {
            Err("Trailing geometry data".into())
        }
    }
}
struct CompletionJob {
    source_start: usize,
    start: usize,
    count: usize,
    projection: Projection,
}
/// CPU completion state owned by one rendering Worker. Caller arrays remain independently owned.
pub struct GeometryFinalizer {
    lengths: Vec<usize>,
    offsets: Vec<usize>,
    base: Vec<GlueConnection>,
    glue: Vec<GlueConnection>,
    changed: Vec<usize>,
    length: usize,
}
impl GeometryFinalizer {
    pub fn new(layout: &[f64]) -> Result<Self, String> {
        let mut cursor = Cursor { values: layout };
        if cursor.number()? != 1. {
            return Err("Unsupported geometry layout".into());
        }
        let count = cursor.index()?;
        let connections = cursor.index()?;
        if count > cursor.values.len() {
            return Err("Invalid geometry part count".into());
        }
        let mut lengths = Vec::with_capacity(count);
        let mut offsets = Vec::with_capacity(count);
        let mut length = 0_usize;
        for _ in 0..count {
            let n = cursor.index()?;
            if n % 2 != 0 {
                return Err("Odd geometry coordinate count".into());
            }
            offsets.push(length);
            length = length.checked_add(n).ok_or("Geometry length overflow")?;
            lengths.push(n);
        }
        if connections > cursor.values.len() / 11 {
            return Err("Invalid geometry connection count".into());
        }
        let mut glue = Vec::with_capacity(connections);
        for _ in 0..connections {
            let a = cursor.index()?;
            let b = cursor.index()?;
            let x = cursor.index()?;
            let y = cursor.index()?;
            let mode = match cursor.index()? {
                0 => None,
                1 => Some(GlueMode::Vertex),
                2 => Some(GlueMode::Translate),
                3 => Some(GlueMode::Rigid),
                _ => return Err("Invalid glue mode".into()),
            };
            let end = cursor.number()?;
            let position = cursor.number()?;
            let first = cursor.number()?;
            let second = cursor.index()?;
            let weight = cursor.number()?;
            let strength = cursor.number()?;
            if a >= count
                || b >= count
                || x.checked_add(1).is_none_or(|v| v >= lengths[a])
                || y.checked_add(1).is_none_or(|v| v >= lengths[b])
            {
                return Err("Glue exceeds geometry layout".into());
            }
            let edge = if end == -1. {
                None
            } else {
                if end < 0.
                    || end.fract() != 0.
                    || end >= (lengths[b] / 2) as f64
                    || !(0.0..=1.0).contains(&position)
                {
                    return Err("Invalid glue edge".into());
                }
                Some(GlueEdge {
                    end_index: end as usize,
                    position,
                })
            };
            let rotation = if first == -1. {
                None
            } else {
                if first < 0.
                    || first.fract() != 0.
                    || first >= (lengths[a] / 2) as f64
                    || second >= lengths[b] / 2
                {
                    return Err("Invalid glue rotation".into());
                }
                Some(GlueRotation {
                    first: first as usize,
                    second,
                })
            };
            glue.push(GlueConnection {
                first_part: a,
                second_part: b,
                first_offset: x,
                second_offset: y,
                mode,
                edge,
                rotation,
                weight,
                strength,
            });
        }
        cursor.done()?;
        Ok(Self {
            lengths,
            offsets,
            base: glue.clone(),
            glue,
            changed: vec![],
            length,
        })
    }
    /// Corrects pre-Glue coordinates, then retains this frame's attachment weights for `join`.
    pub fn correct(
        &mut self,
        packet: &[f64],
        source: &[f32],
        output: &mut [f32],
        indices: &[u32],
        all: bool,
    ) -> Result<(), String> {
        self.correct_with(packet, source, None, output, indices, all)
    }
    /// Corrects using original coordinates packed in the same order as the jobs.
    pub fn correct_packed(
        &mut self,
        packet: &[f64],
        source: &[f32],
        ranges: &[Range<usize>],
        output: &mut [f32],
        indices: &[u32],
        all: bool,
    ) -> Result<(), String> {
        self.correct_with(packet, source, Some(ranges), output, indices, all)
    }
    fn correct_with(
        &mut self,
        packet: &[f64],
        source: &[f32],
        ranges: Option<&[Range<usize>]>,
        output: &mut [f32],
        indices: &[u32],
        all: bool,
    ) -> Result<(), String> {
        if (ranges.is_none() && source.len() != self.length) || output.len() != self.length {
            return Err("Geometry vertex count changed".into());
        }
        let mut cursor = Cursor { values: packet };
        let count = cursor.index()?;
        let changes = cursor.index()?;
        if count > self.lengths.len() {
            return Err("Too many geometry jobs".into());
        }
        if ranges.is_some_and(|ranges| ranges.len() != count) {
            return Err("Packed geometry range count changed".into());
        }
        let mut jobs = Vec::with_capacity(count);
        let mut seen = vec![false; self.lengths.len()];
        let mut packed_start = 0;
        for job in 0..count {
            let part = cursor.index()?;
            let start = cursor.index()?;
            let count = cursor.index()?;
            let kind = cursor.index()?;
            let length = cursor.index()?;
            let required = match kind {
                1 => 14,
                2..=4 => 12,
                _ => return Err("Unsupported correction operation".into()),
            };
            if part >= seen.len()
                || seen[part]
                || start != self.offsets[part] / 2
                || count != self.lengths[part] / 2
                || length != required
            {
                return Err("Invalid correction job".into());
            }
            seen[part] = true;
            let values = cursor.take(length)?.to_vec();
            if values.iter().any(|v| !v.is_finite()) {
                return Err("Non-finite correction values".into());
            }
            let source_start = if let Some(ranges) = ranges {
                if ranges[job] != (start * 2..(start + count) * 2) {
                    return Err("Packed geometry range changed".into());
                }
                let offset = packed_start;
                packed_start += count * 2;
                offset
            } else {
                start * 2
            };
            jobs.push(CompletionJob {
                source_start,
                start,
                count,
                projection: Projection {
                    kind: kind as u32,
                    values,
                },
            });
        }
        if ranges.is_some() && packed_start != source.len() {
            return Err("Packed geometry vertex count changed".into());
        }
        if changes > self.glue.len() || changes > cursor.values.len() / 3 {
            return Err("Too many glue changes".into());
        }
        let mut deltas = Vec::with_capacity(changes);
        for _ in 0..changes {
            let index = cursor.index()?;
            let weight = cursor.number()?;
            let strength = cursor.number()?;
            if index >= self.glue.len() {
                return Err("Invalid glue change".into());
            }
            deltas.push((index, weight, strength));
        }
        cursor.done()?;
        let find = |index: usize| {
            jobs.iter()
                .find(|job| (job.start..job.start + job.count).contains(&index))
        };
        if indices.iter().any(|&i| find(i as usize).is_none()) {
            return Err("Unknown correction vertex".into());
        }
        for &index in &self.changed {
            self.glue[index] = self.base[index];
        }
        self.changed.clear();
        for (index, weight, strength) in deltas {
            self.glue[index].weight = weight;
            self.glue[index].strength = strength;
            self.changed.push(index);
        }
        let correct = |job: &CompletionJob, index: usize, output: &mut [f32]| {
            let original = job.source_start + (index - job.start) * 2;
            let point = job.projection.evaluate(Vec2::new(
                f64::from(source[original]),
                f64::from(source[original + 1]),
            ));
            output[index * 2] = point.x as f32;
            output[index * 2 + 1] = point.y as f32;
        };
        if all {
            for job in &jobs {
                for index in job.start..job.start + job.count {
                    correct(job, index, output);
                }
            }
        } else {
            for &index in indices {
                correct(find(index as usize).unwrap(), index as usize, output);
            }
        }
        Ok(())
    }
    /// Applies ordered Glue operations directly to the corrected coordinates.
    pub fn join(&self, vertices: &mut [f32]) -> Result<(), String> {
        if vertices.len() != self.length {
            return Err("Geometry vertex count changed".into());
        }
        let mut remaining = vertices;
        let mut parts = Vec::with_capacity(self.lengths.len());
        for &length in &self.lengths {
            let (part, rest) = std::mem::take(&mut remaining).split_at_mut(length);
            parts.push(part);
            remaining = rest;
        }
        apply_glue(&self.glue, &mut parts);
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    fn layout() -> Vec<f64> {
        let glue = GlueConnection {
            first_part: 0,
            second_part: 1,
            first_offset: 0,
            second_offset: 0,
            edge: None,
            mode: None,
            rotation: None,
            weight: 0.5,
            strength: 1.,
        };
        encode_layout([2, 2], &[glue])
    }
    #[test]
    fn finishes_corrections_and_glue_without_mutating_source_or_retaining_previous_deltas() {
        let mut finish = GeometryFinalizer::new(&layout()).unwrap();
        let source = [1., 2., 9., 10.];
        let mut output = [100., 200., 9., 10.];
        let projection = Projection {
            kind: 1,
            values: vec![0., 0., 3., 4., 1., 0., 1., 1., 0., 0., 0., 0., 1., 0.],
        };
        let job = Job {
            part: 0,
            start: 0,
            count: 1,
            projection: std::rc::Rc::new(projection),
        };
        let mut packet = Vec::new();
        encode_frame(&mut packet, &[job], &[]);
        finish
            .correct(&packet, &source, &mut output, &[0], false)
            .unwrap();
        assert_eq!(output, [4., 6., 9., 10.]);
        finish.join(&mut output).unwrap();
        assert_eq!(output, [6.5, 8., 6.5, 8.]);
        assert_eq!(source, [1., 2., 9., 10.]);
        let mut changed = finish.base.clone();
        changed[0].strength = 0.;
        encode_frame(
            &mut packet,
            &[],
            &[(0, changed[0].weight, changed[0].strength)],
        );
        finish
            .correct(&packet, &source, &mut output, &[], false)
            .unwrap();
        output.copy_from_slice(&source);
        finish.join(&mut output).unwrap();
        assert_eq!(output, source);
        encode_frame(&mut packet, &[], &[]);
        finish
            .correct(&packet, &source, &mut output, &[], false)
            .unwrap();
        finish.join(&mut output).unwrap();
        assert_eq!(output, [5., 6., 5., 6.]);
    }
    #[test]
    fn rejects_malformed_layouts_and_packets_before_writing_output() {
        assert!(GeometryFinalizer::new(&[1., f64::INFINITY, 0.]).is_err());
        assert!(GeometryFinalizer::new(&[1., 1., 0., 3.]).is_err());
        let mut finish = GeometryFinalizer::new(&layout()).unwrap();
        let mut output = [1., 2., 9., 10.];
        assert!(
            finish
                .correct(
                    &[1., 0., 0., 0., 1., 1., 14.],
                    &output.clone(),
                    &mut output,
                    &[],
                    false
                )
                .is_err()
        );
        assert_eq!(output, [1., 2., 9., 10.]);
    }

    #[test]
    fn packed_sources_follow_job_order_and_reject_mismatched_ranges() {
        let layout = encode_layout([2, 2, 2], &[]);
        let mut finish = GeometryFinalizer::new(&layout).unwrap();
        let projection = std::rc::Rc::new(Projection {
            kind: 1,
            values: vec![0., 0., 3., 4., 1., 0., 1., 1., 0., 0., 0., 0., 1., 0.],
        });
        let jobs = [2, 0].map(|part| Job {
            part,
            start: part,
            count: 1,
            projection: projection.clone(),
        });
        let mut packet = Vec::new();
        encode_frame(&mut packet, &jobs, &[]);
        let source = [1., 2., 5., 6., 9., 10.];
        let mut expected = source;
        finish
            .correct(&packet, &source, &mut expected, &[0, 2], false)
            .unwrap();
        let mut output = source;
        finish
            .correct_packed(
                &packet,
                &[9., 10., 1., 2.],
                &[4..6, 0..2],
                &mut output,
                &[0, 2],
                false,
            )
            .unwrap();
        assert_eq!(output.map(f32::to_bits), expected.map(f32::to_bits));
        output = source;
        assert!(
            finish
                .correct_packed(
                    &packet,
                    &[9., 10., 1., 2.],
                    &[0..2, 4..6],
                    &mut output,
                    &[0, 2],
                    false
                )
                .is_err()
        );
        assert_eq!(output.map(f32::to_bits), source.map(f32::to_bits));
    }
}
