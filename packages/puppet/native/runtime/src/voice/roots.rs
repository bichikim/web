//! Bounded simultaneous polynomial root correction, matching the JS vowel analyzer.
use std::f64::consts::PI;

type Complex = [f64; 2];

fn correction(coefficients: &[f64], roots: &[Complex], index: usize) -> Complex {
    let [real, imaginary] = roots[index];
    let (mut value_real, mut value_imaginary) = (0.0, 0.0);
    for coefficient in coefficients {
        (value_real, value_imaginary) = (
            value_real * real - value_imaginary * imaginary + coefficient,
            value_real * imaginary + value_imaginary * real,
        );
    }
    let (mut divisor_real, mut divisor_imaginary) = (1.0, 0.0);
    for (other, [other_real, other_imaginary]) in roots.iter().enumerate() {
        if other != index {
            let difference_real = real - other_real;
            let difference_imaginary = imaginary - other_imaginary;
            (divisor_real, divisor_imaginary) = (
                divisor_real * difference_real - divisor_imaginary * difference_imaginary,
                divisor_real * difference_imaginary + divisor_imaginary * difference_real,
            );
        }
    }
    let divisor = divisor_real * divisor_real + divisor_imaginary * divisor_imaginary;
    [
        (value_real * divisor_real + value_imaginary * divisor_imaginary) / divisor,
        (value_imaginary * divisor_real - value_real * divisor_imaginary) / divisor,
    ]
}

pub(super) fn polynomial_roots(coefficients: &[f64]) -> Option<Vec<Complex>> {
    const ROOT_PHASE: f64 = 0.25;
    const ROOT_ITERATIONS: usize = 100;
    const ROOT_TOLERANCE: f64 = 1e-8;
    let order = coefficients.len() - 1;
    let mut roots = (0..order)
        .map(|index| {
            let angle = (index as f64 + ROOT_PHASE) * 2.0 * PI / order as f64;
            [angle.cos(), angle.sin()]
        })
        .collect::<Vec<_>>();
    for _ in 0..ROOT_ITERATIONS {
        let shifts = (0..order)
            .map(|index| correction(coefficients, &roots, index))
            .collect::<Vec<_>>();
        let lengths = shifts
            .iter()
            .map(|[real, imaginary]| real.hypot(*imaginary))
            .collect::<Vec<_>>();
        if lengths.iter().any(|length| !length.is_finite()) {
            return None;
        }
        let largest = lengths.into_iter().fold(0.0, f64::max);
        roots.iter_mut().zip(shifts).for_each(|(root, shift)| {
            root[0] -= shift[0];
            root[1] -= shift[1];
        });
        if largest < ROOT_TOLERANCE {
            return Some(roots);
        }
    }
    None
}
