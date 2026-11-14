//! Adaptive-precision `orient2d` ported from JavaScript `robust-predicates` 3.0.3
//! (itself a port of Jonathan Shewchuk's predicates). Released into the public domain
//! (The Unlicense). The sign convention is the JavaScript one: positive when `a, b, c`
//! turn clockwise in a y-up frame (the negation of Shewchuk's `orient2d`).

const EPSILON: f64 = 1.1102230246251565e-16;
const SPLITTER: f64 = 134217729.0;
const RESULT_ERROR_BOUND: f64 = (3.0 + 8.0 * EPSILON) * EPSILON;
const CCW_ERROR_BOUND_A: f64 = (3.0 + 16.0 * EPSILON) * EPSILON;
const CCW_ERROR_BOUND_B: f64 = (2.0 + 12.0 * EPSILON) * EPSILON;
const CCW_ERROR_BOUND_C: f64 = (9.0 + 64.0 * EPSILON) * EPSILON * EPSILON;

pub(super) fn orient2d(a: [f64; 2], b: [f64; 2], c: [f64; 2]) -> f64 {
    let detleft = (a[1] - c[1]) * (b[0] - c[0]);
    let detright = (a[0] - c[0]) * (b[1] - c[1]);
    let det = detleft - detright;
    let detsum = (detleft + detright).abs();
    if det.abs() >= CCW_ERROR_BOUND_A * detsum {
        return det;
    }
    -orient2d_adapt(a, b, c, detsum)
}

/// Exact product `a * b` as `(high, low)`.
fn two_product(a: f64, b: f64) -> (f64, f64) {
    let high = a * b;
    let c = SPLITTER * a;
    let ahi = c - (c - a);
    let alo = a - ahi;
    let c = SPLITTER * b;
    let bhi = c - (c - b);
    let blo = b - bhi;
    (high, alo * blo - (high - ahi * bhi - alo * bhi - ahi * blo))
}

/// Exact `a*b - c*d` as a 4-component expansion (`Two_Two_Diff` of two products).
fn cross_expansion(a: f64, b: f64, c: f64, d: f64) -> [f64; 4] {
    let (s1, s0) = two_product(a, b);
    let (t1, t0) = two_product(c, d);
    let mut out = [0.0; 4];
    let mut i = s0 - t0;
    let mut bvirt = s0 - i;
    out[0] = s0 - (i + bvirt) + (bvirt - t0);
    let j = s1 + i;
    bvirt = j - s1;
    let zero = s1 - (j - bvirt) + (i - bvirt);
    i = zero - t1;
    bvirt = zero - i;
    out[1] = zero - (i + bvirt) + (bvirt - t1);
    let u3 = j + i;
    bvirt = u3 - j;
    out[2] = j - (u3 - bvirt) + (i - bvirt);
    out[3] = u3;
    out
}

/// `x - y` plus its rounding error (`Two_Diff_Tail`).
fn diff_tail(x: f64, y: f64, difference: f64) -> f64 {
    let bvirt = x - difference;
    x - (difference + bvirt) + (bvirt - y)
}

fn orient2d_adapt(a: [f64; 2], b: [f64; 2], c: [f64; 2], detsum: f64) -> f64 {
    let acx = a[0] - c[0];
    let bcx = b[0] - c[0];
    let acy = a[1] - c[1];
    let bcy = b[1] - c[1];

    let big = cross_expansion(acx, bcy, acy, bcx);
    let mut det = big[1..].iter().fold(big[0], |sum, v| sum + v);
    let errbound = CCW_ERROR_BOUND_B * detsum;
    if det >= errbound || -det >= errbound {
        return det;
    }

    let acxtail = diff_tail(a[0], c[0], acx);
    let bcxtail = diff_tail(b[0], c[0], bcx);
    let acytail = diff_tail(a[1], c[1], acy);
    let bcytail = diff_tail(b[1], c[1], bcy);
    if acxtail == 0.0 && acytail == 0.0 && bcxtail == 0.0 && bcytail == 0.0 {
        return det;
    }

    let errbound = CCW_ERROR_BOUND_C * detsum + RESULT_ERROR_BOUND * det.abs();
    det += (acx * bcytail + bcy * acxtail) - (acy * bcxtail + bcx * acytail);
    if det >= errbound || -det >= errbound {
        return det;
    }

    let c1 = expansion_sum(&big, &cross_expansion(acxtail, bcy, acytail, bcx));
    let c2 = expansion_sum(&c1, &cross_expansion(acx, bcytail, acy, bcxtail));
    let d = expansion_sum(&c2, &cross_expansion(acxtail, bcytail, acytail, bcxtail));
    d.last().copied().unwrap_or(0.0)
}

/// `fast_expansion_sum_zeroelim`: sums two nonoverlapping expansions, dropping zeros.
fn expansion_sum(e: &[f64], f: &[f64]) -> Vec<f64> {
    // JavaScript reads `undefined` past the end, which compares false like NaN.
    let at = |v: &[f64], i: usize| v.get(i).copied().unwrap_or(f64::NAN);
    let takes_e = |enow: f64, fnow: f64| (fnow > enow) == (fnow > -enow);
    let mut h = Vec::with_capacity(e.len() + f.len());
    let (mut eindex, mut findex) = (0, 0);
    let (mut enow, mut fnow) = (at(e, 0), at(f, 0));
    let mut q;
    if takes_e(enow, fnow) {
        q = enow;
        eindex += 1;
        enow = at(e, eindex);
    } else {
        q = fnow;
        findex += 1;
        fnow = at(f, findex);
    }
    if eindex < e.len() && findex < f.len() {
        let (q_new, hh);
        if takes_e(enow, fnow) {
            q_new = enow + q;
            hh = q - (q_new - enow);
            eindex += 1;
            enow = at(e, eindex);
        } else {
            q_new = fnow + q;
            hh = q - (q_new - fnow);
            findex += 1;
            fnow = at(f, findex);
        }
        q = q_new;
        if hh != 0.0 {
            h.push(hh);
        }
        while eindex < e.len() && findex < f.len() {
            let next = if takes_e(enow, fnow) {
                eindex += 1;
                std::mem::replace(&mut enow, at(e, eindex))
            } else {
                findex += 1;
                std::mem::replace(&mut fnow, at(f, findex))
            };
            q = two_sum_into(q, next, &mut h);
        }
    }
    while eindex < e.len() {
        eindex += 1;
        q = two_sum_into(q, std::mem::replace(&mut enow, at(e, eindex)), &mut h);
    }
    while findex < f.len() {
        findex += 1;
        q = two_sum_into(q, std::mem::replace(&mut fnow, at(f, findex)), &mut h);
    }
    if q != 0.0 || h.is_empty() {
        h.push(q);
    }
    h
}

/// Adds `value` to `q`, pushing the nonzero rounding error; returns the new sum.
fn two_sum_into(q: f64, value: f64, h: &mut Vec<f64>) -> f64 {
    let q_new = q + value;
    let bvirt = q_new - q;
    let hh = q - (q_new - bvirt) + (value - bvirt);
    if hh != 0.0 {
        h.push(hh);
    }
    q_new
}

#[cfg(test)]
mod tests {
    use super::orient2d;

    #[test]
    fn signs_follow_javascript() {
        assert!(orient2d([0.0, 0.0], [1.0, 0.0], [0.0, 1.0]) < 0.0);
        assert!(orient2d([0.0, 0.0], [0.0, 1.0], [1.0, 0.0]) > 0.0);
        assert_eq!(orient2d([0.0, 0.0], [1.0, 1.0], [2.0, 2.0]), 0.0);
    }

    #[test]
    fn nearly_collinear_points_match_javascript() {
        // Expected values are `orient2d(...)` output from robust-predicates 3.0.3.
        let cases = [
            (
                [0.1, 0.1],
                [0.2, 0.2],
                [0.30000000000000004, 0.3],
                5.551115123125783e-18,
            ),
            (
                [1.0 / 3.0, 1.0 / 7.0],
                [2.0 / 3.0, 2.0 / 7.0],
                [1.0, 3.0 / 7.0],
                7.93016446160826e-18,
            ),
            (
                [0.5, 0.5],
                [12.1, 12.1],
                [24.3, 24.300000000000004],
                -4.121147867408581e-14,
            ),
            ([1e-30, 0.0], [1.0, 1e-30], [3.0, 3.0], -3.0),
        ];
        for (a, b, c, expected) in cases {
            assert_eq!(orient2d(a, b, c), expected, "{a:?} {b:?} {c:?}");
        }
    }
}
