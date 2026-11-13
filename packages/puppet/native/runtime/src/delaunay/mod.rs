//! Delaunay triangulation ported from JavaScript `delaunator` 5.1.0 so 2D keyforms get the
//! same triangles as the TypeScript player (cocircular grids depend on exact flip order).
//!
//! delaunator — ISC License, Copyright (c) 2026, Mapbox.
//! Permission to use, copy, modify, and/or distribute this software for any purpose with or
//! without fee is hereby granted, provided that the above copyright notice and this permission
//! notice appear in all copies. THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL
//! WARRANTIES WITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY
//! AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT, INDIRECT, OR
//! CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS,
//! WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF OR IN
//! CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.

mod predicates;

use predicates::orient2d;

const EPSILON: f64 = f64::EPSILON;
const EDGE_STACK_SIZE: usize = 512;
const NONE: usize = usize::MAX;

/// Counter-clockwise triangles (vertex index triples) and the counter-clockwise convex hull.
#[derive(Debug, Clone, PartialEq, Eq, Default)]
pub(crate) struct Triangulation {
    pub(crate) triangles: Vec<usize>,
    pub(crate) hull: Vec<usize>,
}

/// Triangulates finite points; non-finite input yields an empty triangulation.
pub(crate) fn triangulate(points: &[[f64; 2]]) -> Triangulation {
    if points.iter().flatten().any(|v| !v.is_finite()) {
        return Triangulation::default();
    }
    Builder::new(points).run()
}

struct Builder<'p> {
    points: &'p [[f64; 2]],
    triangles: Vec<usize>,
    halfedges: Vec<usize>,
    hull_prev: Vec<usize>,
    hull_next: Vec<usize>,
    hull_tri: Vec<usize>,
    hull_hash: Vec<usize>,
    hull_start: usize,
    center: [f64; 2],
}

impl<'p> Builder<'p> {
    fn new(points: &'p [[f64; 2]]) -> Self {
        let n = points.len();
        let hash_size = (n as f64).sqrt().ceil() as usize;
        Self {
            points,
            triangles: Vec::with_capacity(n.saturating_mul(2).saturating_sub(5) * 3),
            halfedges: Vec::with_capacity(n.saturating_mul(2).saturating_sub(5) * 3),
            hull_prev: vec![0; n],
            hull_next: vec![0; n],
            hull_tri: vec![0; n],
            hull_hash: vec![NONE; hash_size],
            hull_start: 0,
            center: [0.0; 2],
        }
    }

    fn run(mut self) -> Triangulation {
        let points = self.points;
        let n = points.len();
        let (mut min, mut max) = ([f64::INFINITY; 2], [f64::NEG_INFINITY; 2]);
        for p in points {
            for axis in 0..2 {
                min[axis] = min[axis].min(p[axis]);
                max[axis] = max[axis].max(p[axis]);
            }
        }
        let middle = [(min[0] + max[0]) / 2.0, (min[1] + max[1]) / 2.0];

        // Seed: closest to the center, its nearest neighbour, then the smallest circumcircle.
        let i0 = closest(points, middle, |_| true, NONE).unwrap_or(0);
        let p0 = points.get(i0).copied().unwrap_or_default();
        let mut i1 = closest(points, p0, |d| d > 0.0, i0).unwrap_or(0);
        let mut i2 = 0;
        let mut min_radius = f64::INFINITY;
        let p1 = points.get(i1).copied().unwrap_or_default();
        for (i, p) in points.iter().enumerate() {
            if i == i0 || i == i1 {
                continue;
            }
            let r = circumradius(p0, p1, *p);
            if r < min_radius {
                i2 = i;
                min_radius = r;
            }
        }
        let mut ids: Vec<usize> = (0..n).collect();
        let mut dists = vec![0.0; n];

        if min_radius == f64::INFINITY {
            // Collinear: order by dx (or dy when x is shared) and return the list as a hull.
            let first = points.first().copied().unwrap_or_default();
            for (d, p) in dists.iter_mut().zip(points) {
                let dx = p[0] - first[0];
                *d = if dx != 0.0 && !dx.is_nan() {
                    dx
                } else {
                    p[1] - first[1]
                };
            }
            quicksort(&mut ids, &dists);
            let mut hull = Vec::new();
            let mut d0 = f64::NEG_INFINITY;
            for &id in &ids {
                if dists[id] > d0 {
                    hull.push(id);
                    d0 = dists[id];
                }
            }
            return Triangulation {
                triangles: Vec::new(),
                hull,
            };
        }

        if orient2d(p0, points[i1], points[i2]) < 0.0 {
            std::mem::swap(&mut i1, &mut i2);
        }
        let (p1, p2) = (points[i1], points[i2]);
        self.center = circumcenter(p0, p1, p2);
        for (d, p) in dists.iter_mut().zip(points) {
            *d = dist(*p, self.center);
        }
        quicksort(&mut ids, &dists);

        self.hull_start = i0;
        let mut hull_size = 3;
        self.hull_next[i0] = i1;
        self.hull_prev[i2] = i1;
        self.hull_next[i1] = i2;
        self.hull_prev[i0] = i2;
        self.hull_next[i2] = i0;
        self.hull_prev[i1] = i0;
        self.hull_tri[i0] = 0;
        self.hull_tri[i1] = 1;
        self.hull_tri[i2] = 2;
        for (i, p) in [(i0, p0), (i1, p1), (i2, p2)] {
            self.set_hash(p, i);
        }
        self.add_triangle(i0, i1, i2, NONE, NONE, NONE);

        let mut previous = [0.0; 2];
        for (k, &i) in ids.iter().enumerate() {
            let p = points[i];
            // Skip near-duplicate points.
            if k > 0
                && (p[0] - previous[0]).abs() <= EPSILON
                && (p[1] - previous[1]).abs() <= EPSILON
            {
                continue;
            }
            previous = p;
            if i == i0 || i == i1 || i == i2 {
                continue;
            }
            // A point exactly at the circumcenter has no hash key; JavaScript reads garbage there.
            let Some(start) = self.visible_start(p) else {
                continue;
            };
            let start = self.hull_prev[start];
            let mut e = start;
            loop {
                let q = self.hull_next[e];
                if orient2d(p, points[e], points[q]) < 0.0 {
                    break;
                }
                e = q;
                if e == start {
                    e = NONE;
                    break;
                }
            }
            if e == NONE {
                continue; // likely a near-duplicate point
            }

            let mut t = self.add_triangle(e, i, self.hull_next[e], NONE, NONE, self.hull_tri[e]);
            self.hull_tri[i] = self.legalize(t + 2);
            self.hull_tri[e] = t;
            hull_size += 1;

            // Walk forward through the hull.
            let mut next = self.hull_next[e];
            loop {
                let q = self.hull_next[next];
                if orient2d(p, points[next], points[q]) >= 0.0 {
                    break;
                }
                t = self.add_triangle(next, i, q, self.hull_tri[i], NONE, self.hull_tri[next]);
                self.hull_tri[i] = self.legalize(t + 2);
                self.hull_next[next] = next;
                hull_size -= 1;
                next = q;
            }
            // Walk backward from the other side.
            if e == start {
                loop {
                    let q = self.hull_prev[e];
                    if orient2d(p, points[q], points[e]) >= 0.0 {
                        break;
                    }
                    t = self.add_triangle(q, i, e, NONE, self.hull_tri[e], self.hull_tri[q]);
                    self.legalize(t + 2);
                    self.hull_tri[q] = t;
                    self.hull_next[e] = e;
                    hull_size -= 1;
                    e = q;
                }
            }

            self.hull_start = e;
            self.hull_prev[i] = e;
            self.hull_next[e] = i;
            self.hull_prev[next] = i;
            self.hull_next[i] = next;
            self.set_hash(p, i);
            self.set_hash(points[e], e);
        }

        let mut hull = Vec::with_capacity(hull_size);
        let mut e = self.hull_start;
        for _ in 0..hull_size {
            hull.push(e);
            e = self.hull_next[e];
        }
        Triangulation {
            triangles: self.triangles,
            hull,
        }
    }

    fn hash_key(&self, p: [f64; 2]) -> Option<usize> {
        let size = self.hull_hash.len();
        let angle = pseudo_angle(p[0] - self.center[0], p[1] - self.center[1]);
        let key = (angle * size as f64).floor();
        // `pseudo_angle` is in [0, 1], so a finite key is a small non-negative integer.
        key.is_finite().then(|| key as usize % size.max(1))
    }

    fn set_hash(&mut self, p: [f64; 2], value: usize) {
        if let Some(slot) = self.hash_key(p).and_then(|key| self.hull_hash.get_mut(key)) {
            *slot = value;
        }
    }

    /// Finds a live hull vertex near `p` through the angular hash.
    fn visible_start(&self, p: [f64; 2]) -> Option<usize> {
        let size = self.hull_hash.len();
        let key = self.hash_key(p)?;
        let mut start = NONE;
        for j in 0..size {
            start = self.hull_hash[(key + j) % size];
            if start != NONE && start != self.hull_next[start] {
                break;
            }
        }
        (start != NONE).then_some(start)
    }

    fn link(&mut self, a: usize, b: usize) {
        self.halfedges[a] = b;
        if b != NONE {
            self.halfedges[b] = a;
        }
    }

    fn add_triangle(
        &mut self,
        i0: usize,
        i1: usize,
        i2: usize,
        a: usize,
        b: usize,
        c: usize,
    ) -> usize {
        let t = self.triangles.len();
        self.triangles.extend([i0, i1, i2]);
        self.halfedges.extend([NONE; 3]);
        self.link(t, a);
        self.link(t + 1, b);
        self.link(t + 2, c);
        t
    }

    /// Flips edges until the Delaunay condition holds around `a`.
    fn legalize(&mut self, mut a: usize) -> usize {
        let points = self.points;
        let mut stack = [0usize; EDGE_STACK_SIZE];
        let mut i = 0;
        let mut ar;
        loop {
            let b = self.halfedges[a];
            let a0 = a - a % 3;
            ar = a0 + (a + 2) % 3;
            if b == NONE {
                if i == 0 {
                    break;
                }
                i -= 1;
                a = stack[i];
                continue;
            }
            let b0 = b - b % 3;
            let al = a0 + (a + 1) % 3;
            let bl = b0 + (b + 2) % 3;
            let p0 = self.triangles[ar];
            let pr = self.triangles[a];
            let pl = self.triangles[al];
            let p1 = self.triangles[bl];

            if in_circle(points[p0], points[pr], points[pl], points[p1]) {
                self.triangles[a] = p1;
                self.triangles[b] = p0;
                let hbl = self.halfedges[bl];
                // Edge swapped on the other side of the hull (rare): fix the half-edge reference.
                if hbl == NONE {
                    let mut e = self.hull_start;
                    loop {
                        if self.hull_tri[e] == bl {
                            self.hull_tri[e] = a;
                            break;
                        }
                        e = self.hull_prev[e];
                        if e == self.hull_start {
                            break;
                        }
                    }
                }
                self.link(a, hbl);
                self.link(b, self.halfedges[ar]);
                self.link(ar, bl);
                let br = b0 + (b + 1) % 3;
                if i < EDGE_STACK_SIZE {
                    stack[i] = br;
                    i += 1;
                }
            } else {
                if i == 0 {
                    break;
                }
                i -= 1;
                a = stack[i];
            }
        }
        ar
    }
}

/// First index (excluding `skip`) with the strictly smallest distance accepted by `accept`.
fn closest(
    points: &[[f64; 2]],
    target: [f64; 2],
    accept: impl Fn(f64) -> bool,
    skip: usize,
) -> Option<usize> {
    let mut best = None;
    let mut min_dist = f64::INFINITY;
    for (i, p) in points.iter().enumerate() {
        if i == skip {
            continue;
        }
        let d = dist(target, *p);
        if d < min_dist && accept(d) {
            best = Some(i);
            min_dist = d;
        }
    }
    best
}

fn pseudo_angle(dx: f64, dy: f64) -> f64 {
    let p = dx / (dx.abs() + dy.abs());
    (if dy > 0.0 { 3.0 - p } else { 1.0 + p }) / 4.0
}

fn dist(a: [f64; 2], b: [f64; 2]) -> f64 {
    let dx = a[0] - b[0];
    let dy = a[1] - b[1];
    dx * dx + dy * dy
}

/// Non-robust in-circle test, as in delaunator.
fn in_circle(a: [f64; 2], b: [f64; 2], c: [f64; 2], p: [f64; 2]) -> bool {
    let (dx, dy) = (a[0] - p[0], a[1] - p[1]);
    let (ex, ey) = (b[0] - p[0], b[1] - p[1]);
    let (fx, fy) = (c[0] - p[0], c[1] - p[1]);
    let ap = dx * dx + dy * dy;
    let bp = ex * ex + ey * ey;
    let cp = fx * fx + fy * fy;
    dx * (ey * cp - bp * fy) - dy * (ex * cp - bp * fx) + ap * (ex * fy - ey * fx) < 0.0
}

fn circumcenter_offset(a: [f64; 2], b: [f64; 2], c: [f64; 2]) -> [f64; 2] {
    let (dx, dy) = (b[0] - a[0], b[1] - a[1]);
    let (ex, ey) = (c[0] - a[0], c[1] - a[1]);
    let bl = dx * dx + dy * dy;
    let cl = ex * ex + ey * ey;
    let d = 0.5 / (dx * ey - dy * ex);
    [(ey * bl - dy * cl) * d, (dx * cl - ex * bl) * d]
}

fn circumradius(a: [f64; 2], b: [f64; 2], c: [f64; 2]) -> f64 {
    let [x, y] = circumcenter_offset(a, b, c);
    x * x + y * y
}

fn circumcenter(a: [f64; 2], b: [f64; 2], c: [f64; 2]) -> [f64; 2] {
    let [x, y] = circumcenter_offset(a, b, c);
    [a[0] + x, a[1] + y]
}

/// delaunator's quicksort of `ids` by `dists[id]` (its tie order decides the insertion order).
fn quicksort(ids: &mut [usize], dists: &[f64]) {
    let Some(right) = ids.len().checked_sub(1) else {
        return;
    };
    sort_range(ids, dists, 0, right);
}

fn sort_range(ids: &mut [usize], dists: &[f64], left: usize, right: usize) {
    if left >= right {
        return;
    }
    let d = |ids: &[usize], i: usize| dists[ids[i]];
    if right - left <= 20 {
        for i in left + 1..=right {
            let temp = ids[i];
            let temp_dist = dists[temp];
            let mut j = i;
            while j > left && d(ids, j - 1) > temp_dist {
                ids[j] = ids[j - 1];
                j -= 1;
            }
            ids[j] = temp;
        }
        return;
    }
    let median = (left + right) >> 1;
    let mut i = left + 1;
    let mut j = right;
    ids.swap(median, i);
    if d(ids, left) > d(ids, right) {
        ids.swap(left, right);
    }
    if d(ids, i) > d(ids, right) {
        ids.swap(i, right);
    }
    if d(ids, left) > d(ids, i) {
        ids.swap(left, i);
    }
    let temp = ids[i];
    let temp_dist = dists[temp];
    loop {
        // Finite distances: the median-of-three ends act as sentinels for both scans.
        i += 1;
        while d(ids, i) < temp_dist {
            i += 1;
        }
        j -= 1;
        while d(ids, j) > temp_dist {
            j -= 1;
        }
        if j < i {
            break;
        }
        ids.swap(i, j);
    }
    ids[left + 1] = ids[j];
    ids[j] = temp;
    if right + 1 - i >= j - left {
        sort_range(ids, dists, i, right);
        sort_range(ids, dists, left, j.saturating_sub(1));
    } else {
        sort_range(ids, dists, left, j.saturating_sub(1));
        sort_range(ids, dists, i, right);
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn grid(columns: u32, rows: u32) -> Vec<[f64; 2]> {
        let axis = |i: u32, n: u32| f64::from(i) / f64::from(n - 1) * 2.0 - 1.0;
        (0..rows)
            .flat_map(|y| (0..columns).map(move |x| [axis(x, columns), axis(y, rows)]))
            .collect()
    }

    #[test]
    fn cocircular_grids_match_javascript() {
        // Expected values are `Delaunator.from(points)` output from delaunator 5.1.0.
        let square = triangulate(&[[0.0, 0.0], [1.0, 0.0], [0.0, 1.0], [1.0, 1.0]]);
        assert_eq!(square.triangles, [0, 2, 1, 2, 3, 1]);
        assert_eq!(square.hull, [2, 3, 1, 0]);
        let three = triangulate(&grid(3, 3));
        assert_eq!(
            three.triangles,
            [
                4, 1, 0, 0, 3, 4, 4, 2, 1, 4, 5, 2, 3, 6, 4, 4, 7, 5, 6, 7, 4, 7, 8, 5
            ]
        );
        assert_eq!(three.hull, [7, 8, 5, 2, 1, 0, 3, 6]);
        let wide = triangulate(&grid(5, 3));
        assert_eq!(
            wide.triangles,
            [
                7, 1, 6, 7, 2, 1, 1, 0, 6, 7, 3, 2, 0, 5, 6, 7, 8, 3, 8, 4, 3, 8, 9, 4, 5, 11, 6,
                6, 11, 7, 7, 12, 8, 8, 13, 9, 11, 12, 7, 5, 10, 11, 12, 13, 8, 13, 14, 9
            ]
        );
        assert_eq!(wide.hull, [13, 14, 9, 4, 3, 2, 1, 0, 5, 10, 11, 12]);
    }

    #[test]
    fn collinear_points_only_have_a_hull() {
        let result = triangulate(&[[2.0, 0.0], [0.0, 0.0], [1.0, 0.0], [1.0, 0.0]]);
        assert!(result.triangles.is_empty());
        assert_eq!(result.hull, vec![1, 2, 0]);
    }

    #[test]
    fn non_finite_points_are_rejected() {
        assert_eq!(
            triangulate(&[[f64::NAN, 0.0], [1.0, 0.0], [0.0, 1.0]]),
            Triangulation::default()
        );
    }

    #[test]
    fn quicksort_orders_large_inputs() {
        let dists: Vec<f64> = (0..100).map(|i| f64::from((i * 37) % 101)).collect();
        let mut ids: Vec<usize> = (0..100).collect();
        quicksort(&mut ids, &dists);
        assert!(ids.windows(2).all(|w| dists[w[0]] <= dists[w[1]]));
    }
}
