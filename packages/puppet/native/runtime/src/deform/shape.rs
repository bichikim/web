//! Point transforms of one deformer layout (`grid.ts`, `curve.ts`, `bone.ts`, `pin.ts`,
//! `internal/surface.ts`, `internal/get-surface-weights.ts`).

use std::collections::HashMap;

use poffo_format::document::{CurveAxis, CurveHandle, DeformerShape};

use crate::geometry::{Vec2, wrap_angle};

/// A mesh vertex identity, used for per-vertex influences and bone weights.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub(crate) struct VertexKey {
    pub(crate) part: usize,
    pub(crate) vertex: usize,
}

/// Per-vertex lookups of a layout, resolved from part ids once at load.
#[derive(Debug, Clone, Default)]
pub(crate) struct ShapeLookups {
    influences: Option<HashMap<VertexKey, f64>>,
    bone_weights: HashMap<VertexKey, Vec<f64>>,
}

impl ShapeLookups {
    pub(crate) fn new(shape: &DeformerShape, part_index: &impl Fn(&str) -> Option<usize>) -> Self {
        let influences = shape.vertex_influences.as_ref().map(|entries| {
            let mut map = HashMap::new();
            for entry in entries {
                if let Some(part) = part_index(&entry.part_id) {
                    // The first entry for a vertex wins, as in `getInfluenceIndex`.
                    map.entry(VertexKey {
                        part,
                        vertex: entry.vertex_index,
                    })
                    .or_insert(entry.weight);
                }
            }
            map
        });
        let mut bone_weights = HashMap::new();
        for entry in shape.bone_weights.iter().flatten() {
            if let Some(part) = part_index(&entry.part_id) {
                bone_weights
                    .entry(VertexKey {
                        part,
                        vertex: entry.vertex_index,
                    })
                    .or_insert_with(|| entry.weights.clone());
            }
        }
        Self {
            influences,
            bone_weights,
        }
    }

    /// `getVertexInfluence`: full influence unless listed.
    pub(crate) fn influence(&self, vertex: Option<VertexKey>) -> f64 {
        match (&self.influences, vertex) {
            (Some(map), Some(key)) => map.get(&key).copied().unwrap_or(1.0),
            _ => 1.0,
        }
    }
}

/// A layout with its current control points (rest or posed).
#[derive(Debug, Clone)]
pub(crate) struct Layout<'a> {
    pub(crate) shape: &'a DeformerShape,
    pub(crate) control_points: &'a [f64],
    /// Curve handle per control point index.
    pub(crate) handles: &'a [Option<CurveHandle>],
    pub(crate) lookups: &'a ShapeLookups,
    /// Bone segment frames for these control points ([`bone_segments`]); empty unless the
    /// shape has `boneRestPoints`.
    pub(crate) bones: &'a [BoneSegment],
    pub(crate) rotation_reflection: [bool; 2],
}

/// One bone segment's rest start and posed frame, the same for every point of a layout
/// (`getBoneSegmentTransforms`).
#[derive(Debug, Clone, Copy, PartialEq)]
pub(crate) struct BoneSegment {
    start: Vec2,
    origin: Vec2,
    sine: f64,
    cosine: f64,
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

/// Indexes handles by control point for grid sampling. The table ends after the last handled
/// control point (lookups past it find none), so huge grids allocate nothing extra.
pub(crate) fn handle_table(
    shape: &DeformerShape,
    handles: Option<&[CurveHandle]>,
) -> Vec<Option<CurveHandle>> {
    let points = (shape.columns as usize + 1).checked_mul(shape.rows as usize + 1);
    let handled = handles
        .into_iter()
        .flatten()
        .map(|h| h.point_index.saturating_add(1))
        .max()
        .unwrap_or(0);
    let mut table = vec![None; points.map_or(handled, |points| points.min(handled))];
    for handle in handles.into_iter().flatten() {
        if let Some(slot) = table.get_mut(handle.point_index) {
            // `Array.find` returns the first handle for an index.
            slot.get_or_insert(*handle);
        }
    }
    table
}

fn point_at(points: &[f64], index: usize) -> Vec2 {
    Vec2::new(
        points.get(index * 2).copied().unwrap_or(0.0),
        points.get(index * 2 + 1).copied().unwrap_or(0.0),
    )
}

impl Layout<'_> {
    /// `transformUnweightedShape`.
    pub(crate) fn transform(&self, point: Vec2, vertex: Option<VertexKey>) -> Vec2 {
        let shape = self.shape;
        if shape.pins.is_some() {
            return self.pin(point);
        }
        if shape.bone_rest_points.is_some() {
            return self.bone(point, vertex);
        }
        if shape.curve_axis.is_some() {
            return self.curve(point);
        }
        if let Some(interpolation) = shape.interpolation {
            return super::warp_grid::sample(self, point, interpolation);
        }
        let b = shape.bounds;
        self.surface((point.x - b.x) / b.width, (point.y - b.y) / b.height)
    }

    fn pin(&self, point: Vec2) -> Vec2 {
        let (mut horizontal, mut vertical, mut total) = (0.0, 0.0, 0.0);
        for (index, pin) in self.shape.pins.iter().flatten().enumerate() {
            let progress = (1.0 - (point.x - pin.x).hypot(point.y - pin.y) / pin.radius).max(0.0);
            let weight = progress * progress * (3.0 - 2.0 * progress) * pin.strength;
            let control = point_at(self.control_points, index);
            horizontal += (control.x - pin.x) * weight;
            vertical += (control.y - pin.y) * weight;
            total += weight;
        }
        let divisor = f64::max(1.0, total);
        Vec2::new(point.x + horizontal / divisor, point.y + vertical / divisor)
    }

    fn curve(&self, point: Vec2) -> Vec2 {
        let shape = self.shape;
        let b = shape.bounds;
        let vertical = shape.curve_axis == Some(CurveAxis::Y);
        let length = if vertical { b.height } else { b.width };
        let progress = if vertical {
            (point.y - b.y) / length
        } else {
            (point.x - b.x) / length
        };
        let offset = if vertical {
            point.x - b.x - b.width / 2.0
        } else {
            point.y - b.y - b.height / 2.0
        };
        let clamped = progress.clamp(0.0, 1.0);
        let segment_count = ((self.control_points.len() / 2).saturating_sub(1) / 3).max(1);
        let default_breaks = [0.0, 1.0];
        let breaks = shape.curve_breaks.as_deref().unwrap_or(&default_breaks);
        let segment = match breaks.iter().position(|&boundary| boundary > clamped) {
            None => segment_count - 1,
            Some(found) => found.saturating_sub(1),
        };
        let (start_break, end_break) = (
            breaks.get(segment).copied().unwrap_or(0.0),
            breaks.get(segment + 1).copied().unwrap_or(1.0),
        );
        let time = (clamped - start_break) / (end_break - start_break);
        let inverse = 1.0 - time;
        let p: [Vec2; 4] = std::array::from_fn(|i| point_at(self.control_points, segment * 3 + i));
        let weights = [
            inverse.powi(3),
            3.0 * inverse.powi(2) * time,
            3.0 * inverse * time.powi(2),
            time.powi(3),
        ];
        let center = p.iter().zip(weights).fold(Vec2::ZERO, |acc, (q, w)| {
            Vec2::new(acc.x + q.x * w, acc.y + q.y * w)
        });
        let mut tangent = Vec2::new(
            3.0 * inverse.powi(2) * (p[1].x - p[0].x)
                + 6.0 * inverse * time * (p[2].x - p[1].x)
                + 3.0 * time.powi(2) * (p[3].x - p[2].x),
            3.0 * inverse.powi(2) * (p[1].y - p[0].y)
                + 6.0 * inverse * time * (p[2].y - p[1].y)
                + 3.0 * time.powi(2) * (p[3].y - p[2].y),
        );
        const EPSILON: f64 = 0.000001;
        if tangent.length() < EPSILON {
            tangent = Vec2::new(p[3].x - p[0].x, p[3].y - p[0].y);
        }
        if tangent.length() < EPSILON {
            tangent = if vertical {
                Vec2::new(0.0, 1.0)
            } else {
                Vec2::new(1.0, 0.0)
            };
        }
        let magnitude = tangent.length();
        let direction = Vec2::new(tangent.x / magnitude, tangent.y / magnitude);
        let extension = (progress - clamped) * length;
        let normal = if vertical {
            Vec2::new(direction.y, -direction.x)
        } else {
            Vec2::new(-direction.y, direction.x)
        };
        Vec2::new(
            center.x + direction.x * extension + normal.x * offset,
            center.y + direction.y * extension + normal.y * offset,
        )
    }

    fn grid_point(&self, column: usize, row: usize) -> Vec2 {
        point_at(
            self.control_points,
            row * (self.shape.columns as usize + 1) + column,
        )
    }

    fn handle(&self, index: usize) -> Option<&CurveHandle> {
        self.handles.get(index).and_then(Option::as_ref)
    }

    /// Tangent at a control point: from its handle, else the given chord.
    fn axis_tangent(&self, index: usize, horizontal: bool, fallback: Vec2) -> Vec2 {
        let columns = self.shape.columns as usize + 1;
        let point = self.grid_point(index % columns, index / columns);
        match self.handle(index) {
            None => fallback,
            Some(handle) => {
                let h = if horizontal {
                    handle.horizontal
                } else {
                    handle.vertical
                };
                Vec2::new((h.x - point.x) * 3.0, (h.y - point.y) * 3.0)
            }
        }
    }

    /// `sampleDeformerSurface(...).point` for a Hermite-blended warp grid.
    fn surface(&self, horizontal_progress: f64, vertical_progress: f64) -> Vec2 {
        let columns = self.shape.columns as usize;
        let rows = self.shape.rows as usize;
        let horizontal_position = horizontal_progress * columns as f64;
        let vertical_position = vertical_progress * rows as f64;
        let column = (horizontal_position.floor().max(0.0) as usize).min(columns - 1);
        let row = (vertical_position.floor().max(0.0) as usize).min(rows - 1);
        let column_progress = horizontal_position - column as f64;
        let row_progress = vertical_position - row as f64;
        let top_left = self.grid_point(column, row);
        let top_right = self.grid_point(column + 1, row);
        let bottom_left = self.grid_point(column, row + 1);
        let bottom_right = self.grid_point(column + 1, row + 1);
        let top_left_index = row * (columns + 1) + column;
        let bottom_left_index = (row + 1) * (columns + 1) + column;
        let top_has_handle =
            self.handle(top_left_index).is_some() || self.handle(top_left_index + 1).is_some();
        let bottom_has_handle = self.handle(bottom_left_index).is_some()
            || self.handle(bottom_left_index + 1).is_some();
        let horizontal_weights = curve_weights(column_progress).point;
        let vertical_weights = with_tangent_fallback(
            curve_weights(row_progress).point,
            top_has_handle,
            bottom_has_handle,
        );

        let top_difference = top_right - top_left;
        let bottom_difference = bottom_right - bottom_left;
        let top = cubic(
            top_left,
            self.axis_tangent(top_left_index, true, top_difference),
            top_right,
            self.axis_tangent(top_left_index + 1, true, top_difference),
            horizontal_weights,
        );
        let bottom = cubic(
            bottom_left,
            self.axis_tangent(bottom_left_index, true, bottom_difference),
            bottom_right,
            self.axis_tangent(bottom_left_index + 1, true, bottom_difference),
            horizontal_weights,
        );
        let top_tangent = Vec2::lerp(
            self.axis_tangent(top_left_index, false, bottom_left - top_left),
            self.axis_tangent(top_left_index + 1, false, bottom_right - top_right),
            column_progress,
        );
        let bottom_tangent = Vec2::lerp(
            self.axis_tangent(bottom_left_index, false, bottom_left - top_left),
            self.axis_tangent(bottom_left_index + 1, false, bottom_right - top_right),
            column_progress,
        );
        cubic(top, top_tangent, bottom, bottom_tangent, vertical_weights)
    }

    fn bone(&self, point: Vec2, vertex: Option<VertexKey>) -> Vec2 {
        let segments = self.bones;
        let mut inline = [0.0; INLINE_BONE_SEGMENTS];
        let mut spilled = Vec::new();
        let weights: &[f64] = match vertex.and_then(|key| self.lookups.bone_weights.get(&key)) {
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
            return Vec2::lerp(point, moved(segment), weight(0));
        }
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

#[derive(Clone, Copy)]
struct CubicWeights {
    start: f64,
    start_tangent: f64,
    end: f64,
    end_tangent: f64,
}

struct CurveWeights {
    point: CubicWeights,
}

fn curve_weights(t: f64) -> CurveWeights {
    let squared = t * t;
    let cubed = squared * t;
    CurveWeights {
        point: CubicWeights {
            end: 3.0 * squared - 2.0 * cubed,
            end_tangent: cubed - squared,
            start: 2.0 * cubed - 3.0 * squared + 1.0,
            start_tangent: cubed - 2.0 * squared + t,
        },
    }
}

/// Rows without handles blend linearly by folding tangent terms into the endpoints.
fn with_tangent_fallback(
    w: CubicWeights,
    top_has_handle: bool,
    bottom_has_handle: bool,
) -> CubicWeights {
    let start_fallback = if top_has_handle { 0.0 } else { w.start_tangent };
    let end_fallback = if bottom_has_handle {
        0.0
    } else {
        w.end_tangent
    };
    CubicWeights {
        end: w.end + start_fallback + end_fallback,
        end_tangent: if bottom_has_handle {
            w.end_tangent
        } else {
            0.0
        },
        start: w.start - start_fallback - end_fallback,
        start_tangent: if top_has_handle { w.start_tangent } else { 0.0 },
    }
}

fn cubic(start: Vec2, start_tangent: Vec2, end: Vec2, end_tangent: Vec2, w: CubicWeights) -> Vec2 {
    Vec2::new(
        start.x * w.start
            + start_tangent.x * w.start_tangent
            + end.x * w.end
            + end_tangent.x * w.end_tangent,
        start.y * w.start
            + start_tangent.y * w.start_tangent
            + end.y * w.end
            + end_tangent.y * w.end_tangent,
    )
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

#[cfg(test)]
mod tests {
    use super::*;

    fn shape(json: serde_json::Value) -> DeformerShape {
        serde_json::from_value(json).expect("shape")
    }

    #[test]
    fn identity_grid_maps_points_to_themselves() {
        let s = shape(serde_json::json!({
            "bounds": {"x": 0, "y": 0, "width": 2, "height": 2}, "columns": 1, "rows": 1,
            "controlPoints": [0, 0, 2, 0, 0, 2, 2, 2]
        }));
        let lookups = ShapeLookups::default();
        let layout = Layout {
            shape: &s,
            control_points: &s.control_points,
            handles: &[],
            lookups: &lookups,
            bones: &[],
            rotation_reflection: [false; 2],
        };
        let p = layout.transform(Vec2::new(0.5, 1.5), None);
        assert!(
            (p.x - 0.5).abs() < 1e-12 && (p.y - 1.5).abs() < 1e-12,
            "{p:?}"
        );
    }

    #[test]
    fn bone_channels_round_trip() {
        let rest = [0.0, 0.0, 10.0, 0.0, 20.0, 0.0];
        let pose = [1.0, 2.0, 1.0, 12.0, 11.0, 12.0];
        let channels = bone_channels(&rest, &pose);
        let back = pose_bone_channels(&rest, &channels);
        for (a, b) in back.iter().zip(pose) {
            assert!((a - b).abs() < 1e-9);
        }
    }

    #[test]
    fn rotation_bone_rotates_points_about_its_pivot() {
        let s = shape(serde_json::json!({
            "deformerType": "rotation", "boneRestPoints": [0, 0, 10, 0],
            "bounds": {"x": 0, "y": 0, "width": 10, "height": 10}, "columns": 1, "rows": 1,
            "controlPoints": [0, 0, 0, 10]
        }));
        let lookups = ShapeLookups::default();
        let bones = bone_segments(&s, &s.control_points, 1.0);
        let layout = Layout {
            shape: &s,
            control_points: &s.control_points,
            handles: &[],
            lookups: &lookups,
            bones: &bones,
            rotation_reflection: [false; 2],
        };
        let p = layout.transform(Vec2::new(5.0, 0.0), None);
        assert!(p.x.abs() < 1e-9 && (p.y - 5.0).abs() < 1e-9, "{p:?}");
        let scaled_bones = bone_segments(&s, &s.control_points, 2.0);
        let scaled = Layout {
            bones: &scaled_bones,
            ..layout
        };
        let p = scaled.transform(Vec2::new(5.0, 0.0), None);
        assert!(p.x.abs() < 1e-9 && (p.y - 10.0).abs() < 1e-9, "{p:?}");
    }

    #[test]
    fn huge_grids_index_handles_without_overflow() {
        let s = shape(serde_json::json!({
            "bounds": {"x": 0, "y": 0, "width": 2, "height": 2},
            "columns": u32::MAX, "rows": u32::MAX, "controlPoints": []
        }));
        let handle: CurveHandle = serde_json::from_value(serde_json::json!({
            "pointIndex": 3, "horizontal": {"x": 1, "y": 0}, "vertical": {"x": 0, "y": 1}
        }))
        .expect("handle");
        let table = handle_table(&s, Some(&[handle]));
        assert_eq!(table.len(), 4);
        assert_eq!(table[3], Some(handle));
        assert!(handle_table(&s, None).is_empty());
    }
}
