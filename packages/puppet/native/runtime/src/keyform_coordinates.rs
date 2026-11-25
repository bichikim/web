//! Borrowed keyform samples avoid shared-allocator contention during part composition.
use crate::{
    grid_keyform::GridCoordinates,
    keyform::{FlatSample, KeyformSample},
};

pub(crate) enum FlatCoordinates<'a> {
    One(&'a [f64]),
    Two(&'a [f64], &'a [f64], f64),
    Three([&'a [f64]; 3], [f64; 3]),
}
impl<'a> FlatCoordinates<'a> {
    fn new(sample: FlatSample, get: &impl Fn(usize) -> &'a [f64]) -> Self {
        match sample {
            FlatSample::One(a) => Self::One(get(a)),
            FlatSample::Two(a, b, t) => Self::Two(get(a), get(b), t),
            FlatSample::Three(indices, weights) => Self::Three(indices.map(get), weights),
        }
    }
    fn len(&self) -> usize {
        match self {
            Self::One(first) | Self::Two(first, ..) => first.len(),
            Self::Three([first, ..], _) => first.len(),
        }
    }
    fn coordinate(&self, axis: usize) -> Option<f64> {
        match self {
            Self::One(first) => first.get(axis).copied(),
            Self::Two(first, second, t) => first
                .get(axis)
                .map(|&x| x + (second.get(axis).copied().unwrap_or(x) - x) * t),
            Self::Three([first, second, third], w) => first.get(axis).map(|&x| {
                x * w[0]
                    + second.get(axis).copied().unwrap_or(x) * w[1]
                    + third.get(axis).copied().unwrap_or(x) * w[2]
            }),
        }
    }
}
pub(crate) enum Coordinates<'a> {
    Flat(FlatCoordinates<'a>),
    Planes(FlatCoordinates<'a>, FlatCoordinates<'a>, f64),
    Grid(GridCoordinates<'a>, &'a [f64]),
}
impl Coordinates<'_> {
    pub(crate) fn len(&self) -> usize {
        match self {
            Self::Flat(first) | Self::Planes(first, ..) => first.len(),
            Self::Grid(_, rest) => rest.len(),
        }
    }
    pub(crate) fn coordinate(&self, axis: usize) -> Option<f64> {
        match self {
            Self::Flat(first) => first.coordinate(axis),
            Self::Planes(first, second, t) => first
                .coordinate(axis)
                .map(|x| x + (second.coordinate(axis).unwrap_or(x) - x) * t),
            Self::Grid(channels, rest) => rest
                .get(axis)
                .map(|&fallback| channels.coordinate(axis, fallback)),
        }
    }
}
pub(crate) fn sample_coordinates<'a>(
    sample: KeyformSample,
    coordinates: impl Fn(usize) -> Option<&'a [f64]>,
    rest: &'a [f64],
) -> Coordinates<'a> {
    let get = |index| coordinates(index).unwrap_or(rest);
    match sample {
        KeyformSample::Grid(sample) => {
            Coordinates::Grid(sample.coordinates(coordinates, rest), rest)
        }
        KeyformSample::Flat(sample) => Coordinates::Flat(FlatCoordinates::new(sample, &get)),
        KeyformSample::Planes(first, second, t) => Coordinates::Planes(
            FlatCoordinates::new(first, &get),
            FlatCoordinates::new(second, &get),
            t,
        ),
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::keyform::blend;
    #[test]
    fn retains_dense_blend_bits_and_first_channel_lengths() {
        let forms = [vec![-0.0, 1e15, 0.2, 0.7], vec![0.0, -1e15], vec![]];
        let rest = [0.1, -0.0, 2.0];
        let flat = [
            FlatSample::One(0),
            FlatSample::One(2),
            FlatSample::Two(0, 1, 0.3),
            FlatSample::Three([0, 1, 3], [0.2, 0.3, 0.5]),
        ];
        let get = |index| forms.get(index).map(Vec::as_slice);
        for sample in flat
            .into_iter()
            .map(KeyformSample::Flat)
            .chain(flat.into_iter().flat_map(|a| {
                flat.into_iter()
                    .map(move |b| KeyformSample::Planes(a, b, 0.37))
            }))
        {
            let expected = blend(sample, get, &rest);
            let actual = sample_coordinates(sample, get, &rest);
            assert_eq!(actual.len(), expected.len());
            for (axis, value) in expected.into_iter().enumerate() {
                assert_eq!(actual.coordinate(axis).unwrap().to_bits(), value.to_bits());
            }
        }
    }
}
