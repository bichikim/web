//! Bone segment frames, weighted point transforms and pose channels.

use super::{Layout, VertexKey, point_at};
use crate::geometry::{Vec2, wrap_angle};
use poffo_format::document::DeformerShape;

/// One bone segment's rest start and posed frame, the same for every point of a layout
/// (`getBoneSegmentTransforms`).
#[derive(Debug, Clone, Copy, PartialEq)]
pub(crate) struct BoneSegment {
    start: Vec2,
    origin: Vec2,
    sine: f64,
    cosine: f64,
}
impl BoneSegment {
    pub(crate) fn projection(self) -> [f64; 6] {
        [
            self.start.x,
            self.start.y,
            self.origin.x,
            self.origin.y,
            self.cosine,
            self.sine,
        ]
    }
}

/// The segment frames of a bone layout posed by `control_points`, with a rotation deformer's
/// `scale` about its pivot (1 for other layouts); empty for shapes without bones.
pub(crate) fn bone_segments(
    shape: &DeformerShape,
    control_points: &[f64],
    scale: f64,
) -> Vec<BoneSegment> {
    let Some(rest) = shape.bone_rest_points.as_deref() else {
        return Vec::new();
    };
    let pose = normalize_bone_pose(rest, control_points);
    (0..(rest.len() / 2).saturating_sub(1))
        .map(|index| {
            let start = point_at(rest, index);
            let end = point_at(rest, index + 1);
            let origin = point_at(&pose, index);
            let target = point_at(&pose, index + 1);
            let angle = (target.y - origin.y).atan2(target.x - origin.x)
                - (end.y - start.y).atan2(end.x - start.x);
            let (sine, cosine) = angle.sin_cos();
            BoneSegment {
                start,
                origin,
                sine: sine * scale,
                cosine: cosine * scale,
            }
        })
        .collect()
}

/// Bone layouts with at most this many segments weigh points without allocating.
const INLINE_BONE_SEGMENTS: usize = 16;

impl Layout<'_> {
    pub(super) fn bone(&self, point: Vec2, vertex: Option<VertexKey>) -> Vec2 {
        let segments = self.bones;
        let manual = vertex.and_then(|key| self.lookups.bone_weights.get(&key));
        let moved = |segment: &BoneSegment| {
            let mut local = point - segment.start;
            if self.rotation_reflection[0] {
                local.x = -local.x;
            }
            if self.rotation_reflection[1] {
                local.y = -local.y;
            }
            Vec2::new(
                segment.origin.x + local.x * segment.cosine - local.y * segment.sine,
                segment.origin.y + local.x * segment.sine + local.y * segment.cosine,
            )
        };
        if let [segment] = segments {
            // A single procedural influence normalizes to one; retain authored manual weights.
            let weight = manual.map_or(1.0, |weights| weights.first().copied().unwrap_or(0.0));
            return Vec2::lerp(point, moved(segment), weight);
        }
        let mut inline = [0.0; INLINE_BONE_SEGMENTS];
        let mut spilled = Vec::new();
        let weights: &[f64] = match manual {
            Some(manual) => manual,
            None => {
                let buffer = if segments.len() <= INLINE_BONE_SEGMENTS {
                    &mut inline[..segments.len()]
                } else {
                    spilled.resize(segments.len(), 0.0);
                    &mut spilled[..]
                };
                self.distance_weights(point, buffer);
                buffer
            }
        };
        let weight = |index: usize| weights.get(index).copied().unwrap_or(0.0);
        let total: f64 = (0..segments.len()).map(weight).sum();
        segments
            .iter()
            .enumerate()
            .fold(Vec2::ZERO, |acc, (index, segment)| {
                let (w, moved) = (weight(index), moved(segment));
                Vec2::new(acc.x + moved.x * w / total, acc.y + moved.y * w / total)
            })
    }

    /// `getBoneWeights` without manual weights: inverse squared distance to each segment,
    /// normalized, written to `weights` (one per segment).
    fn distance_weights(&self, point: Vec2, weights: &mut [f64]) {
        const EPSILON: f64 = 0.000001;
        let rest = self.shape.bone_rest_points.as_deref().unwrap_or_default();
        for (index, weight) in weights.iter_mut().enumerate() {
            let start = point_at(rest, index);
            let end = point_at(rest, index + 1);
            let d = end - start;
            let length = d.x.hypot(d.y);
            let t = (((point.x - start.x) * d.x + (point.y - start.y) * d.y) / (length * length))
                .clamp(0.0, 1.0);
            let distance = (point.x - start.x - t * d.x).hypot(point.y - start.y - t * d.y);
            *weight = 1.0 / (distance * distance + f64::max(EPSILON, length * length * EPSILON));
        }
        let total: f64 = weights.iter().sum();
        for weight in weights {
            *weight /= total;
        }
    }
}

/// `normalizeBonePose`: keeps rest segment lengths along the posed directions.
pub(crate) fn normalize_bone_pose(rest: &[f64], pose: &[f64]) -> Vec<f64> {
    const EPSILON: f64 = 0.000001;
    let mut result: Vec<f64> = pose.iter().take(2).copied().collect();
    for index in 1..rest.len() / 2 {
        let origin = point_at(rest, index - 1);
        let end = point_at(rest, index);
        let previous = point_at(pose, index - 1);
        let target = point_at(pose, index);
        let mut d = target - previous;
        if d.length() < EPSILON {
            d = end - origin;
        }
        let scale = (end - origin).length() / f64::max(EPSILON, d.length());
        let parent = point_at(&result, index - 1);
        result.push(parent.x + d.x * scale);
        result.push(parent.y + d.y * scale);
    }
    result
}

/// `getBoneChannels`: root position followed by relative joint angles.
pub(crate) fn bone_channels(rest: &[f64], pose: &[f64]) -> Vec<f64> {
    let mut channels: Vec<f64> = pose.iter().take(2).copied().collect();
    let mut parent = 0.0;
    for index in 1..rest.len() / 2 {
        let start = point_at(rest, index - 1);
        let end = point_at(rest, index);
        let origin = point_at(pose, index - 1);
        let target = point_at(pose, index);
        let angle = (target.y - origin.y).atan2(target.x - origin.x)
            - (end.y - start.y).atan2(end.x - start.x);
        channels.push(wrap_angle(angle - parent));
        parent = angle;
    }
    channels
}

/// `poseBoneChannels`: inverse of [`bone_channels`].
pub(crate) fn pose_bone_channels(rest: &[f64], channels: &[f64]) -> Vec<f64> {
    let mut points: Vec<f64> = channels.iter().take(2).copied().collect();
    let mut parent = 0.0;
    for index in 1..rest.len() / 2 {
        let start = point_at(rest, index - 1);
        let end = point_at(rest, index);
        parent += channels.get(index + 1).copied().unwrap_or(0.0);
        let angle = parent + (end.y - start.y).atan2(end.x - start.x);
        let length = (end - start).length();
        let origin = point_at(&points, index - 1);
        points.push(origin.x + angle.cos() * length);
        points.push(origin.y + angle.sin() * length);
    }
    points
}
