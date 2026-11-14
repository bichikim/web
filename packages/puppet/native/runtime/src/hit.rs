//! Hit areas (`internal/hit-area.ts`).

use crate::model::Model;
use crate::player::Frame;

fn side(from: [f64; 2], to: [f64; 2], p: [f64; 2]) -> f64 {
    (to[0] - from[0]) * (p[1] - from[1]) - (to[1] - from[1]) * (p[0] - from[0])
}

/// Whether the triangle of vertex indices `triangle` over the XY `vertices` contains `point`.
/// Either winding counts and edges are included; a triangle that is collapsed, non-finite or
/// indexes past `vertices` covers nothing.
pub fn triangle_contains(vertices: &[f32], triangle: [u32; 3], point: [f64; 2]) -> bool {
    let at = |i: u32| {
        let i = i as usize * 2;
        [
            vertices.get(i).map_or(f64::NAN, |&v| f64::from(v)),
            vertices.get(i + 1).map_or(f64::NAN, |&v| f64::from(v)),
        ]
    };
    let corners = triangle.map(at);
    // Twice the signed area: a collapsed or non-finite triangle covers nothing.
    let area = side(corners[0], corners[1], corners[2]);
    area.is_finite()
        && area != 0.0
        && [0, 1, 2]
            .iter()
            .all(|&i| side(corners[i], corners[(i + 1) % 3], point) * area >= 0.0)
}

/// Whether any triangle of `indices` over the XY `vertices` contains `point`.
fn contains(vertices: &[f32], indices: &[u32], point: [f64; 2]) -> bool {
    indices
        .chunks_exact(3)
        .any(|t| triangle_contains(vertices, [t[0], t[1], t[2]], point))
}

impl Model {
    /// Whether the frame's deformed mesh of `part` contains `point`.
    fn part_contains(&self, frame: &Frame, part: usize, point: [f64; 2]) -> bool {
        let (Some(vertices), Some(source)) =
            (frame.vertices.get(part), self.document.parts.get(part))
        else {
            return false;
        };
        contains(vertices, &source.mesh.indices, point)
    }

    /// The hit area whose topmost part (by paint order) contains `point` in document
    /// coordinates, using the frame's deformed meshes. Hidden parts count.
    pub fn hit_area<'m>(&'m self, frame: &Frame, point: [f64; 2]) -> Option<&'m str> {
        let area_of = |part: usize| {
            let id = &self.document.parts[part].id;
            self.document
                .hit_areas
                .iter()
                .find(|a| a.part_ids.contains(id))
                .map(|a| a.id.as_str())
        };
        frame.plans.iter().rev().find_map(|plan| {
            let area = area_of(plan.part)?;
            self.part_contains(frame, plan.part, point).then_some(area)
        })
    }

    /// The topmost drawn part (`visible` and `render`, by paint order) whose deformed mesh in
    /// `frame` contains `point` in document coordinates.
    pub fn part_at(&self, frame: &Frame, point: [f64; 2]) -> Option<usize> {
        frame
            .plans
            .iter()
            .rev()
            .filter(|plan| plan.visible && plan.render)
            .map(|plan| plan.part)
            .find(|&part| self.part_contains(frame, part, point))
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn triangles_include_edges() {
        let square = [0.0, 0.0, 10.0, 0.0, 0.0, 10.0, 10.0, 10.0];
        let indices = [0, 1, 2, 1, 3, 2];
        assert!(contains(&square, &indices, [5.0, 5.0]));
        assert!(contains(&square, &indices, [0.0, 3.0]));
        assert!(!contains(&square, &indices, [11.0, 5.0]));
    }

    #[test]
    fn collapsed_or_non_finite_triangles_cover_nothing() {
        let point = [5.0; 6];
        assert!(!contains(&point, &[0, 1, 2], [90.0, 90.0]));
        let broken = [f32::NAN, 0.0, 10.0, 0.0, 0.0, 10.0];
        assert!(!contains(&broken, &[0, 1, 2], [90.0, 90.0]));
        assert!(!triangle_contains(&point, [0, 1, 7], [5.0, 5.0]));
    }

    #[test]
    fn either_winding_counts() {
        let triangle = [0.0, 0.0, 10.0, 0.0, 0.0, 10.0];
        assert!(triangle_contains(&triangle, [0, 1, 2], [2.0, 2.0]));
        assert!(triangle_contains(&triangle, [0, 2, 1], [2.0, 2.0]));
        assert!(!triangle_contains(&triangle, [0, 2, 1], [8.0, 8.0]));
    }
}
