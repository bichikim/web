//! Spatial (3D) parts: mesh attachments and projection (`bind-spatial-mesh.ts`,
//! `project-spatial-surface.ts`, `player/internal/spatial-part.ts`).

use poffo_format::document::{SpatialAttachment, SpatialMesh, SpatialSurface};

use crate::deform::SpatialPose;

const DIVISIONS: usize = 32;
const EPSILON: f64 = 0.000001;
const FACING_AREA_RATIO: f64 = 0.000_001;

#[derive(Debug, Clone)]
struct Triangle {
    index: u32,
    points: [f64; 6],
    denominator: f64,
}

fn mesh_point(mesh: &SpatialMesh, vertex: u32) -> [f64; 3] {
    let o = vertex as usize * 3;
    let v = |i: usize| mesh.vertices.get(o + i).copied().unwrap_or(0.0);
    [v(0), v(1), v(2)]
}

fn triangle(mesh: &SpatialMesh, index: u32) -> Triangle {
    let i = index as usize * 3;
    let corner = |k: usize| mesh_point(mesh, mesh.indices.get(i + k).copied().unwrap_or(0));
    let (a, b, c) = (corner(0), corner(1), corner(2));
    Triangle {
        index,
        points: [a[0], a[1], b[0], b[1], c[0], c[1]],
        denominator: (b[1] - c[1]) * (a[0] - c[0]) + (c[0] - b[0]) * (a[1] - c[1]),
    }
}

fn weights(t: &Triangle, x: f64, y: f64) -> [f64; 3] {
    let [ax, ay, bx, by, cx, cy] = t.points;
    let first = ((by - cy) * (x - cx) + (cx - bx) * (y - cy)) / t.denominator;
    let second = ((cy - ay) * (x - cx) + (ax - cx) * (y - cy)) / t.denominator;
    [first, second, 1.0 - first - second]
}

/// `resolveSpatialMeshAttachment`: the attached 3D point in mesh coordinates.
pub(crate) fn resolve_attachment(
    mesh: &SpatialMesh,
    attachment: &SpatialAttachment,
) -> Option<[f64; 3]> {
    let start = attachment.triangle_index as usize * 3;
    let corners = mesh.indices.get(start..start + 3)?;
    let points: Vec<[f64; 3]> = corners.iter().map(|&v| mesh_point(mesh, v)).collect();
    Some([0, 1, 2].map(|axis| {
        points
            .iter()
            .zip(attachment.weights)
            .fold(attachment.offset[axis], |sum, (p, w)| sum + p[axis] * w)
    }))
}

fn nearest_edge_weights(t: &Triangle, x: f64, y: f64) -> [f64; 3] {
    let p = t.points;
    let mut best: Option<(f64, [f64; 3])> = None;
    for first in 0..3 {
        let second = (first + 1) % 3;
        let (ax, ay) = (p[first * 2], p[first * 2 + 1]);
        let (dx, dy) = (p[second * 2] - ax, p[second * 2 + 1] - ay);
        let length = dx * dx + dy * dy;
        let fraction = if length == 0.0 {
            0.0
        } else {
            (((x - ax) * dx + (y - ay) * dy) / length).clamp(0.0, 1.0)
        };
        let mut w = [0.0; 3];
        w[first] = 1.0 - fraction;
        w[second] = fraction;
        let distance = (x - ax - dx * fraction).powi(2) + (y - ay - dy * fraction).powi(2);
        if best.is_none_or(|(d, _)| distance < d) {
            best = Some((distance, w));
        }
    }
    best.map_or([1.0, 0.0, 0.0], |(_, w)| w)
}

/// A projected sample: the attachment and the surface point under `(x, y)`.
#[derive(Debug, Clone, Copy)]
pub(crate) struct Sample {
    pub(crate) attachment_offset: [f64; 3],
    pub(crate) triangle_index: u32,
    pub(crate) weights: [f64; 3],
    pub(crate) point: [f64; 3],
}

/// Spatial index over the mesh's XY projection (`createSpatialMeshAttachmentSampler`).
#[derive(Debug, Clone)]
pub(crate) struct Sampler {
    triangles: Vec<Triangle>,
    cells: Vec<Vec<usize>>,
    bounds: [f64; 4],
}

impl Sampler {
    pub(crate) fn new(mesh: &SpatialMesh) -> Self {
        let triangles: Vec<Triangle> = (0..(mesh.indices.len() / 3) as u32)
            .map(|i| triangle(mesh, i))
            .filter(|t| t.denominator.abs() >= EPSILON)
            .collect();
        let mut bounds = [
            f64::INFINITY,
            f64::INFINITY,
            f64::NEG_INFINITY,
            f64::NEG_INFINITY,
        ];
        for t in &triangles {
            let [ax, ay, bx, by, cx, cy] = t.points;
            bounds = [
                bounds[0].min(ax).min(bx).min(cx),
                bounds[1].min(ay).min(by).min(cy),
                bounds[2].max(ax).max(bx).max(cx),
                bounds[3].max(ay).max(by).max(cy),
            ];
        }
        let mut sampler = Self {
            triangles,
            cells: vec![Vec::new(); DIVISIONS * DIVISIONS],
            bounds,
        };
        for (index, t) in sampler.triangles.iter().enumerate() {
            let [ax, ay, bx, by, cx, cy] = t.points;
            for row in sampler.y_cell(ay.min(by).min(cy))..=sampler.y_cell(ay.max(by).max(cy)) {
                for column in
                    sampler.x_cell(ax.min(bx).min(cx))..=sampler.x_cell(ax.max(bx).max(cx))
                {
                    sampler.cells[row * DIVISIONS + column].push(index);
                }
            }
        }
        sampler
    }

    fn cell(value: f64, min: f64, max: f64) -> usize {
        let span = if max - min == 0.0 { 1.0 } else { max - min };
        (((value - min) / span) * DIVISIONS as f64)
            .floor()
            .clamp(0.0, (DIVISIONS - 1) as f64) as usize
    }

    fn x_cell(&self, value: f64) -> usize {
        Self::cell(value, self.bounds[0], self.bounds[2])
    }

    fn y_cell(&self, value: f64) -> usize {
        Self::cell(value, self.bounds[1], self.bounds[3])
    }

    fn sample_triangle(
        mesh: &SpatialMesh,
        t: &Triangle,
        weights: [f64; 3],
        x: f64,
        y: f64,
    ) -> Sample {
        let attachment = SpatialAttachment {
            offset: [0.0; 3],
            triangle_index: t.index,
            weights,
        };
        let point = resolve_attachment(mesh, &attachment).unwrap_or([0.0; 3]);
        Sample {
            attachment_offset: [x - point[0], y - point[1], 0.0],
            triangle_index: t.index,
            weights,
            point: [x, y, point[2]],
        }
    }

    /// The frontmost surface under `(x, y)`, else the nearest edge point.
    pub(crate) fn sample(&self, mesh: &SpatialMesh, x: f64, y: f64) -> Option<Sample> {
        if self.triangles.is_empty() {
            return None;
        }
        let mut front: Option<Sample> = None;
        for &index in &self.cells[self.y_cell(y) * DIVISIONS + self.x_cell(x)] {
            let t = &self.triangles[index];
            let w = weights(t, x, y);
            if w.iter().all(|&v| v >= -EPSILON) {
                let sample = Self::sample_triangle(mesh, t, w, x, y);
                if front.is_none_or(|f| sample.point[2] > f.point[2]) {
                    front = Some(sample);
                }
            }
        }
        if front.is_some() {
            return front;
        }
        let mut nearest: Option<(f64, Sample)> = None;
        for t in &self.triangles {
            let w = nearest_edge_weights(t, x, y);
            let sample = Self::sample_triangle(mesh, t, w, x, y);
            let [ax, ay, bx, by, cx, cy] = t.points;
            let sx = ax * w[0] + bx * w[1] + cx * w[2];
            let sy = ay * w[0] + by * w[1] + cy * w[2];
            let distance = (x - sx).powi(2) + (y - sy).powi(2);
            let better = match &nearest {
                None => true,
                Some((d, best)) => {
                    let tolerance = EPSILON * 1.0_f64.max(distance).max(*d);
                    distance < d - tolerance
                        || ((distance - d).abs() <= tolerance && sample.point[2] > best.point[2])
                }
            };
            if better {
                nearest = Some((distance, sample));
            }
        }
        nearest.map(|(_, s)| s)
    }
}

/// Attachments for documents saved before they were stored (`getLegacyAttachments`).
pub(crate) fn legacy_attachments(
    surface: &SpatialSurface,
    mesh: &SpatialMesh,
    sampler: &Sampler,
    position: [f64; 3],
) -> Option<Vec<SpatialAttachment>> {
    surface
        .control_points
        .chunks_exact(3)
        .map(|p| {
            let s = sampler.sample(mesh, p[0] - position[0], p[1] - position[1])?;
            Some(SpatialAttachment {
                triangle_index: s.triangle_index,
                weights: s.weights,
                offset: [
                    s.attachment_offset[0],
                    s.attachment_offset[1],
                    p[2] - s.point[2] - position[2],
                ],
            })
        })
        .collect()
}

/// `getAttachedMeshPoints`: control points following the mesh, re-sampled when it moves.
pub(crate) fn attached_points(
    mesh: &SpatialMesh,
    sampler: &Sampler,
    attachments: &[SpatialAttachment],
    position: [f64; 3],
    rest: [f64; 3],
) -> Option<Vec<f64>> {
    let moved = position != rest;
    let mut out = Vec::with_capacity(attachments.len() * 3);
    for attachment in attachments {
        let local = resolve_attachment(mesh, attachment)?;
        let point = [local[0] + rest[0], local[1] + rest[1], local[2] + rest[2]];
        let point = if moved {
            match (
                sampler.sample(mesh, point[0] - rest[0], point[1] - rest[1]),
                sampler.sample(mesh, point[0] - position[0], point[1] - position[1]),
            ) {
                (Some(before), Some(after)) => [
                    point[0],
                    point[1],
                    point[2] + after.point[2] - before.point[2] + position[2] - rest[2],
                ],
                _ => point,
            }
        } else {
            point
        };
        out.extend_from_slice(&point);
    }
    Some(out)
}

/// Projected 2D vertices and per-vertex depth.
#[derive(Debug, Clone, PartialEq)]
pub(crate) struct Projection {
    pub(crate) vertices: Vec<f64>,
    pub(crate) depths: Vec<f64>,
}

/// `projectSpatialSurface`: scale and rotate about the origin (X, Y, then Z), then translate.
pub(crate) fn project(
    control_points: &[f64],
    origin: [f64; 3],
    pose: Option<&SpatialPose>,
) -> Projection {
    let rotation = pose.map_or([0.0; 3], |p| p.rotation);
    let scale = pose.map_or([1.0; 3], |p| p.scale);
    let translation = pose.map_or([0.0; 3], |p| p.translation);
    let [(sx, cx), (sy, cy), (sz, cz)] =
        rotation.map(|d| (d * std::f64::consts::PI / 180.0).sin_cos());
    let mut vertices = Vec::with_capacity(control_points.len() / 3 * 2);
    let mut depths = Vec::with_capacity(control_points.len() / 3);
    for p in control_points.chunks_exact(3) {
        let x = (p[0] - origin[0]) * scale[0];
        let y = (p[1] - origin[1]) * scale[1];
        let z = (p[2] - origin[2]) * scale[2];
        let rotated_y = y * cx - z * sx;
        let rotated_z = y * sx + z * cx;
        let turned_x = x * cy + rotated_z * sy;
        let turned_z = -x * sy + rotated_z * cy;
        vertices.push(origin[0] + turned_x * cz - rotated_y * sz + translation[0]);
        vertices.push(origin[1] + turned_x * sz + rotated_y * cz + translation[1]);
        depths.push(origin[2] + turned_z + translation[2]);
    }
    Projection { vertices, depths }
}

/// Signed area of the mesh's first triangle.
pub(crate) fn first_triangle_area(vertices: &[f64], indices: &[u32]) -> f64 {
    let [Some(&a), Some(&b), Some(&c)] = [indices.first(), indices.get(1), indices.get(2)] else {
        return 0.0;
    };
    let at = |i: u32, k: usize| vertices.get(i as usize * 2 + k).copied().unwrap_or(0.0);
    let (x1, y1) = (at(b, 0) - at(a, 0), at(b, 1) - at(a, 1));
    let (x2, y2) = (at(c, 0) - at(a, 0), at(c, 1) - at(a, 1));
    x1 * y2 - y1 * x2
}

/// A spatial part's projected pose for this frame.
#[derive(Debug, Clone, PartialEq)]
pub struct SpatialPartPose {
    pub depths: Vec<f64>,
    pub vertices: Vec<f64>,
    pub depth: f64,
    /// The projected first triangle keeps its winding, so the image faces the viewer.
    pub facing: bool,
}

pub(crate) fn part_pose(
    projection: Projection,
    rest_vertices: &[f64],
    indices: &[u32],
) -> SpatialPartPose {
    let source_area = first_triangle_area(rest_vertices, indices);
    let projected_area = first_triangle_area(&projection.vertices, indices);
    let depth = projection.depths.iter().sum::<f64>() / projection.depths.len() as f64;
    SpatialPartPose {
        facing: projected_area / source_area > FACING_AREA_RATIO,
        depth,
        vertices: projection.vertices,
        depths: projection.depths,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn identity_projection_keeps_xy_and_turning_flips_facing() {
        let points = [0.0, 0.0, 0.0, 10.0, 0.0, 0.0, 0.0, 10.0, 0.0];
        let projection = project(&points, [0.0; 3], None);
        assert_eq!(projection.vertices, vec![0.0, 0.0, 10.0, 0.0, 0.0, 10.0]);
        let pose = SpatialPose {
            rotation: [0.0, 180.0, 0.0],
            scale: [1.0; 3],
            ..SpatialPose::default()
        };
        let turned = part_pose(
            project(&points, [0.0; 3], Some(&pose)),
            &projection.vertices,
            &[0, 1, 2],
        );
        assert!(!turned.facing);
    }

    #[test]
    fn sampler_finds_front_surface_and_nearest_outside() {
        let mesh = SpatialMesh {
            indices: vec![0, 1, 2],
            vertices: vec![0.0, 0.0, 1.0, 10.0, 0.0, 1.0, 0.0, 10.0, 1.0],
        };
        let sampler = Sampler::new(&mesh);
        let inside = sampler.sample(&mesh, 2.0, 2.0).expect("inside");
        assert_eq!(inside.point, [2.0, 2.0, 1.0]);
        let outside = sampler.sample(&mesh, 20.0, 20.0).expect("nearest");
        assert_eq!(outside.point[2], 1.0);
        let attachment = SpatialAttachment {
            triangle_index: 0,
            weights: inside.weights,
            offset: inside.attachment_offset,
        };
        let resolved = resolve_attachment(&mesh, &attachment).expect("resolve");
        assert!((resolved[0] - 2.0).abs() < 1e-12 && (resolved[1] - 2.0).abs() < 1e-12);
    }
}
