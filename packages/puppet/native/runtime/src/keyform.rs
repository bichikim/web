//! Keyform interpolation (`deformation/parameter.ts`).

const BARYCENTRIC_EPSILON: f64 = 1e-9;

/// Delaunay triangulation of 2D keyform points (`getTriangulation`).
#[derive(Debug, Clone)]
pub(crate) struct Triangulated {
    points: Vec<[f64; 2]>,
    triangles: Vec<usize>,
    hull: Vec<usize>,
}

impl Triangulated {
    fn new(points: Vec<[f64; 2]>) -> Self {
        let triangulation = crate::delaunay::triangulate(&points);
        Self {
            points,
            triangles: triangulation.triangles,
            hull: triangulation.hull,
        }
    }
}

/// One plane of a 3D binding (`getKeyformPlanes`): the 2D points of its keyforms, in document
/// order, and those keyforms' indices.
#[derive(Debug, Clone)]
pub(crate) struct KeyformPlane {
    space: Triangulated,
    indices: Vec<usize>,
}

/// Interpolation structure of one binding's keyform coordinates.
#[derive(Debug, Clone)]
pub(crate) enum KeyformSpace {
    /// Strictly increasing keyform values, and the bound parameter's range when it repeats.
    OneAxis(Vec<f64>, Option<[f64; 2]>),
    TwoAxes(Triangulated),
    /// Planes by increasing third value, and the third parameter's range when it repeats.
    ThreeAxes {
        values: Vec<f64>,
        planes: Vec<KeyformPlane>,
        repeat: Option<[f64; 2]>,
    },
}

/// Blend weights over keyform indices within one keyform line or plane.
#[derive(Debug, Clone, Copy, PartialEq)]
pub(crate) enum FlatSample {
    One(usize),
    Two(usize, usize, f64),
    Three([usize; 3], [f64; 3]),
}

/// Where a value falls among one axis' keys.
#[derive(Debug, Clone, Copy, PartialEq)]
pub(crate) enum Segment {
    /// On (or held at) one key.
    At(usize),
    /// From one key toward another, by the progress between them.
    Between(usize, usize, f64),
}

impl From<Segment> for FlatSample {
    fn from(segment: Segment) -> Self {
        match segment {
            Segment::At(key) => Self::One(key),
            Segment::Between(from, to, t) => Self::Two(from, to, t),
        }
    }
}

/// Where a sample falls: a flat sample, or two plane samples and the progress between them.
#[derive(Debug, Clone, Copy, PartialEq)]
pub(crate) enum KeyformSample {
    Grid(crate::grid_keyform::GridSample),
    Flat(FlatSample),
    Planes(FlatSample, FlatSample, f64),
}

fn point(values: &[f64]) -> [f64; 2] {
    [
        values.first().copied().unwrap_or(0.0),
        values.get(1).copied().unwrap_or(0.0),
    ]
}

impl FlatSample {
    /// The same weights over `indices[i]` instead of `i`.
    fn remap(self, indices: &[usize]) -> Self {
        let at = |i: usize| indices.get(i).copied().unwrap_or(i);
        match self {
            Self::One(a) => Self::One(at(a)),
            Self::Two(a, b, t) => Self::Two(at(a), at(b), t),
            Self::Three(i, w) => Self::Three(i.map(at), w),
        }
    }
}

/// `getKeyformPlanes`: planes by increasing third value, keyforms in document order. A stable
/// sort groups the keyforms once (`O(K log K)`).
fn planes(values: &[Vec<f64>]) -> (Vec<f64>, Vec<KeyformPlane>) {
    let third = |i: usize| values[i].get(2).copied().unwrap_or(0.0);
    let mut order: Vec<usize> = (0..values.len()).collect();
    order.sort_by(|&a, &b| third(a).total_cmp(&third(b)));
    let grouped: Vec<&[usize]> = order.chunk_by(|&a, &b| third(a) == third(b)).collect();
    let keys = grouped.iter().map(|plane| third(plane[0])).collect();
    let planes = grouped
        .into_iter()
        .map(|plane| KeyformPlane {
            space: Triangulated::new(plane.iter().map(|&i| point(&values[i])).collect()),
            indices: plane.to_vec(),
        })
        .collect();
    (keys, planes)
}

impl KeyformSpace {
    /// `repeat` is the range of the binding's last parameter when it repeats; only the first
    /// parameter of a 1D binding and the third of a 3D binding wrap.
    pub(crate) fn new(values: &[Vec<f64>], axes: usize, repeat: Option<[f64; 2]>) -> Self {
        match axes {
            1 => Self::OneAxis(
                values
                    .iter()
                    .map(|v| v.first().copied().unwrap_or(0.0))
                    .collect(),
                repeat,
            ),
            2 => Self::TwoAxes(Triangulated::new(values.iter().map(|v| point(v)).collect())),
            _ => {
                let (values, planes) = planes(values);
                Self::ThreeAxes {
                    values,
                    planes,
                    repeat,
                }
            }
        }
    }

    /// Locates `values` among the keyforms (`sampleParameterCoordinates`).
    pub(crate) fn locate(&self, values: [f64; 3]) -> Option<KeyformSample> {
        let xy = [values[0], values[1]];
        match self {
            Self::OneAxis(keys, repeat) => {
                locate_one(keys, values[0], *repeat).map(|s| KeyformSample::Flat(s.into()))
            }
            Self::TwoAxes(space) => locate_two(space, xy).map(KeyformSample::Flat),
            Self::ThreeAxes {
                values: keys,
                planes,
                repeat,
            } => {
                let at = |plane: usize| {
                    let plane = planes.get(plane)?;
                    locate_two(&plane.space, xy).map(|sample| sample.remap(&plane.indices))
                };
                Some(match locate_one(keys, values[2], *repeat)? {
                    Segment::Between(from, to, t) => KeyformSample::Planes(at(from)?, at(to)?, t),
                    Segment::At(plane) => KeyformSample::Flat(at(plane)?),
                })
            }
        }
    }
}

fn progress(minimum: f64, maximum: f64, value: f64) -> f64 {
    if maximum == minimum {
        0.0
    } else {
        (value - minimum) / (maximum - minimum)
    }
}

/// `locateOneDimensionalKeyform`: the segment of ascending `keys` holding `value`, holding the
/// end keys outside them. With a repeat range the keyform at the maximum is ignored and values
/// past the last keyform (or before the first) blend from the last into the first one placed
/// one range later. `None` without keys.
pub(crate) fn locate_one(keys: &[f64], value: f64, repeat: Option<[f64; 2]>) -> Option<Segment> {
    locate_one_by(keys, |&key| key, value, repeat)
}

/// [`locate_one`] over the key `key_of` reads from each item, without collecting the keys.
/// Called per sample during playback, so it allocates nothing and stops at the segment found.
pub(crate) fn locate_one_by<T>(
    items: &[T],
    key_of: impl Fn(&T) -> f64,
    value: f64,
    repeat: Option<[f64; 2]>,
) -> Option<Segment> {
    let key = |i: usize| key_of(&items[i]);
    let included = |i: &usize| repeat.is_none_or(|[_, maximum]| key(*i) < maximum);
    let first = (0..items.len()).find(included)?;
    let last = (0..items.len()).rev().find(included)?;
    if let Some([minimum, maximum]) = repeat
        && (value >= key(last) || value < key(first))
    {
        let span = maximum - minimum;
        let unwrapped = if value < key(first) {
            value + span
        } else {
            value
        };
        return Some(Segment::Between(
            last,
            first,
            progress(key(last), key(first) + span, unwrapped),
        ));
    }
    let Some(next) = (first..=last).filter(included).find(|&i| key(i) >= value) else {
        return Some(Segment::At(last));
    };
    Some(match (first..next).rev().find(included) {
        None => Segment::At(next),
        Some(previous) => {
            Segment::Between(previous, next, progress(key(previous), key(next), value))
        }
    })
}

fn barycentric(point: [f64; 2], a: [f64; 2], b: [f64; 2], c: [f64; 2]) -> Option<[f64; 3]> {
    let denominator = (b[1] - c[1]) * (a[0] - c[0]) + (c[0] - b[0]) * (a[1] - c[1]);
    if denominator.abs() <= BARYCENTRIC_EPSILON {
        return None;
    }
    let first =
        ((b[1] - c[1]) * (point[0] - c[0]) + (c[0] - b[0]) * (point[1] - c[1])) / denominator;
    let second =
        ((c[1] - a[1]) * (point[0] - c[0]) + (a[0] - c[0]) * (point[1] - c[1])) / denominator;
    Some([first, second, 1.0 - first - second])
}

fn locate_two(space: &Triangulated, value: [f64; 2]) -> Option<FlatSample> {
    let Triangulated {
        points,
        triangles,
        hull,
    } = space;
    if points.is_empty() {
        return None;
    }
    if let Some(exact) = points
        .iter()
        .position(|p| p[0] == value[0] && p[1] == value[1])
    {
        return Some(FlatSample::One(exact));
    }
    if points.len() == 1 {
        return Some(FlatSample::One(0));
    }
    for t in triangles.chunks_exact(3) {
        let (Some(&a), Some(&b), Some(&c)) = (points.get(t[0]), points.get(t[1]), points.get(t[2]))
        else {
            continue;
        };
        if let Some(weights) =
            barycentric(value, a, b, c).filter(|w| w.iter().all(|&x| x >= -BARYCENTRIC_EPSILON))
        {
            return Some(FlatSample::Three([t[0], t[1], t[2]], weights));
        }
    }
    // Outside the triangulation: project onto the closest hull segment.
    let mut closest = None;
    let mut closest_distance = f64::INFINITY;
    for (index, &first_index) in hull.iter().enumerate() {
        let second_index = hull[(index + 1) % hull.len()];
        let (Some(first), Some(second)) = (points.get(first_index), points.get(second_index))
        else {
            continue;
        };
        let (dx, dy) = (second[0] - first[0], second[1] - first[1]);
        let length_squared = dx * dx + dy * dy;
        let t = if length_squared == 0.0 {
            0.0
        } else {
            (((value[0] - first[0]) * dx + (value[1] - first[1]) * dy) / length_squared)
                .clamp(0.0, 1.0)
        };
        let distance =
            (value[0] - (first[0] + dx * t)).powi(2) + (value[1] - (first[1] + dy * t)).powi(2);
        if distance < closest_distance {
            closest_distance = distance;
            closest = Some(FlatSample::Two(first_index, second_index, t));
        }
    }
    closest
}

/// Blends keyform coordinate arrays; missing keyform data falls back to `rest`.
/// The result has `first`'s length, like the TypeScript `map` over the first operand.
pub(crate) fn blend<'a>(
    sample: KeyformSample,
    coordinates: impl Fn(usize) -> Option<&'a [f64]>,
    rest: &'a [f64],
) -> Vec<f64> {
    let get = |i: usize| coordinates(i).unwrap_or(rest);
    let flat = |sample: FlatSample| match sample {
        FlatSample::One(i) => get(i).to_vec(),
        FlatSample::Two(a, b, t) => lerp(get(a), get(b), t),
        FlatSample::Three([a, b, c], w) => {
            let (first, second, third) = (get(a), get(b), get(c));
            first
                .iter()
                .enumerate()
                .map(|(i, &x)| {
                    x * w[0]
                        + second.get(i).copied().unwrap_or(x) * w[1]
                        + third.get(i).copied().unwrap_or(x) * w[2]
                })
                .collect()
        }
    };
    match sample {
        KeyformSample::Grid(sample) => sample.blend(coordinates, rest),
        KeyformSample::Flat(sample) => flat(sample),
        KeyformSample::Planes(from, to, t) => lerp(&flat(from), &flat(to), t),
    }
}

/// `interpolateVertices`: `first` moved toward `second` by `t`, keeping `first`'s length.
fn lerp(first: &[f64], second: &[f64], t: f64) -> Vec<f64> {
    first
        .iter()
        .enumerate()
        .map(|(i, &c)| c + (second.get(i).copied().unwrap_or(c) - c) * t)
        .collect()
}

#[cfg(test)]
mod tests {
    #[test]
    fn repeating_axes_wrap_from_the_last_keyform_into_the_first() {
        let keys = [0.0, 90.0, 360.0];
        let range = Some([0.0, 360.0]);
        assert_eq!(
            locate_one(&keys, 45.0, range),
            Some(Segment::Between(0, 1, 0.5))
        );
        // 90..360 wraps to 0: the keyform at 360 is ignored.
        assert_eq!(
            locate_one(&keys, 225.0, range),
            Some(Segment::Between(1, 0, 0.5))
        );
        let Some(Segment::Between(1, 0, before)) = locate_one(&[90.0, 180.0], 45.0, range) else {
            panic!("expected a wrap segment");
        };
        assert!((before - 5.0 / 6.0).abs() < 1e-12);
        assert_eq!(
            locate_one(&keys, 225.0, None),
            Some(Segment::Between(1, 2, 0.5))
        );
    }

    use super::*;

    #[test]
    fn one_axis_clamps_and_interpolates() {
        let space = KeyformSpace::new(&[vec![-1.0], vec![0.0], vec![1.0]], 1, None);
        let flat = |sample| Some(KeyformSample::Flat(sample));
        assert_eq!(space.locate([-5.0, 0.0, 0.0]), flat(FlatSample::One(0)));
        assert_eq!(space.locate([5.0, 0.0, 0.0]), flat(FlatSample::One(2)));
        assert_eq!(
            space.locate([0.5, 0.0, 0.0]),
            flat(FlatSample::Two(1, 2, 0.5))
        );
        let rest = [0.0, 0.0];
        let forms = [[10.0, 0.0], [20.0, 0.0], [30.0, 0.0]];
        let out = blend(
            KeyformSample::Flat(FlatSample::Two(1, 2, 0.5)),
            |i| Some(&forms[i][..]),
            &rest,
        );
        assert_eq!(out, vec![25.0, 0.0]);
    }

    #[test]
    fn two_axes_use_triangles_inside_and_hull_outside() {
        let values = [
            vec![0.0, 0.0],
            vec![1.0, 0.0],
            vec![0.0, 1.0],
            vec![1.0, 1.0],
        ];
        let space = KeyformSpace::new(&values, 2, None);
        assert_eq!(
            space.locate([1.0, 1.0, 0.0]),
            Some(KeyformSample::Flat(FlatSample::One(3)))
        );
        let Some(KeyformSample::Flat(FlatSample::Three(_, w))) = space.locate([0.25, 0.25, 0.0])
        else {
            panic!("expected a triangle");
        };
        assert!((w.iter().sum::<f64>() - 1.0).abs() < 1e-12);
        assert!(matches!(
            space.locate([2.0, 0.5, 0.0]),
            Some(KeyformSample::Flat(FlatSample::Two(..)))
        ));
    }

    #[test]
    fn three_axes_blend_the_planes_around_the_third_value() {
        // Planes at 1 and -1 listed out of order: indices map back to the document.
        let values = [
            vec![0.0, 0.0, 1.0],
            vec![1.0, 0.0, 1.0],
            vec![0.0, 0.0, -1.0],
            vec![1.0, 0.0, -1.0],
        ];
        let space = KeyformSpace::new(&values, 3, None);
        assert_eq!(
            space.locate([1.0, 0.0, 0.5]),
            Some(KeyformSample::Planes(
                FlatSample::One(3),
                FlatSample::One(1),
                0.75
            ))
        );
        assert_eq!(
            space.locate([0.0, 0.0, 9.0]),
            Some(KeyformSample::Flat(FlatSample::One(0)))
        );
        let forms = [[10.0], [20.0], [30.0], [40.0]];
        let sample = space.locate([0.5, 0.0, 0.0]).expect("between planes");
        assert_eq!(blend(sample, |i| Some(&forms[i][..]), &[0.0]), vec![25.0]);
    }
}
