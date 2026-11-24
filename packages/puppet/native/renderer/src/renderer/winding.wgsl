// Binary64 comparison for the cases where a binary32 determinant cannot certify its sign.
// The inputs are binary32 positions, so finite differences and products fit the binary64 range.
struct Wide {
    negative: bool,
    exponent: i32,
    significand: vec2u,
}

const INFINITY_EXPONENT: i32 = 1024;
const NAN_EXPONENT: i32 = 1025;

fn exact_value(bits: u32) -> Wide {
    let input = fp64_decode_f32_bits(bits);
    let negative = input.sign != 0u;
    if (input.isNan) { return Wide(false, NAN_EXPONENT, vec2u(0u)); }
    if (input.isInf) { return Wide(negative, INFINITY_EXPONENT, vec2u(0u)); }
    if (input.isZero) { return Wide(negative, 0, vec2u(0u)); }
    let leading = 31u - countLeadingZeros(input.significand);
    return Wide(negative, input.baseExponent + i32(leading),
        fp64_u64_shift_left(vec2u(0u, input.significand), 52u - leading));
}

fn is_wide_zero(value: Wide) -> bool {
    return value.exponent < INFINITY_EXPONENT && fp64_u64_is_zero(value.significand);
}

fn shift_right_sticky(value: vec2u, shift: u32) -> vec2u {
    let result = fp64_u64_shift_right(value, shift);
    return vec2u(result.x, result.y | u32(fp64_u64_has_bits_below(value, shift)));
}

// The three low bits hold guard, round and sticky information. Round to nearest, ties to even.
fn round_wide(negative: bool, exponent: i32, extended: vec2u) -> Wide {
    if (fp64_u64_is_zero(extended)) { return Wide(negative, 0, vec2u(0u)); }
    let shift = 8 - i32(fp64_u64_count_leading_zeros(extended));
    var aligned: vec2u;
    if (shift > 0) {
        aligned = shift_right_sticky(extended, u32(shift));
    } else {
        aligned = fp64_u64_shift_left(extended, u32(-shift));
    }
    var result = fp64_u64_shift_right(aligned, 3u);
    let remainder = aligned.y & 7u;
    if (remainder > 4u || (remainder == 4u && (result.y & 1u) != 0u)) {
        result = fp64_u64_add(result, vec2u(0u, 1u));
    }
    if (fp64_u64_get_bit(result, 53u)) {
        return Wide(negative, exponent + shift + 1, fp64_u64_shift_right(result, 1u));
    }
    return Wide(negative, exponent + shift, result);
}

fn compare_magnitude(first: Wide, second: Wide) -> i32 {
    if (is_wide_zero(first)) { return select(-1, 0, is_wide_zero(second)); }
    if (is_wide_zero(second)) { return 1; }
    if (first.exponent != second.exponent) {
        return select(-1, 1, first.exponent > second.exponent);
    }
    return fp64_u64_compare(first.significand, second.significand);
}

fn wide_difference(first: u32, second: u32) -> Wide {
    var larger = exact_value(first);
    var smaller = exact_value(second ^ 0x80000000u);
    if (larger.exponent == NAN_EXPONENT || smaller.exponent == NAN_EXPONENT) {
        return Wide(false, NAN_EXPONENT, vec2u(0u));
    }
    if (compare_magnitude(larger, smaller) < 0) {
        let swap = larger;
        larger = smaller;
        smaller = swap;
    }
    if (larger.exponent == INFINITY_EXPONENT) {
        if (smaller.exponent == INFINITY_EXPONENT && larger.negative != smaller.negative) {
            return Wide(false, NAN_EXPONENT, vec2u(0u));
        }
        return larger;
    }
    if (is_wide_zero(smaller)) { return larger; }
    let high = fp64_u64_shift_left(larger.significand, 3u);
    let low = shift_right_sticky(fp64_u64_shift_left(smaller.significand, 3u),
        u32(larger.exponent - smaller.exponent));
    let extended = select(fp64_u64_add(high, low), fp64_u64_sub(high, low),
        larger.negative != smaller.negative);
    return round_wide(larger.negative, larger.exponent, extended);
}

fn limbs(value: vec2u) -> vec4u {
    return vec4u(value.y & 0xffffu, value.y >> 16u, value.x & 0xffffu, value.x >> 16u);
}

fn wide_product(first: Wide, second: Wide) -> Wide {
    let negative = first.negative != second.negative;
    if (first.exponent == NAN_EXPONENT || second.exponent == NAN_EXPONENT) {
        return Wide(false, NAN_EXPONENT, vec2u(0u));
    }
    let zero = is_wide_zero(first) || is_wide_zero(second);
    if (first.exponent == INFINITY_EXPONENT || second.exponent == INFINITY_EXPONENT) {
        return Wide(negative, select(INFINITY_EXPONENT, NAN_EXPONENT, zero), vec2u(0u));
    }
    if (zero) { return Wide(negative, 0, vec2u(0u)); }
    let a = limbs(first.significand);
    let b = limbs(second.significand);
    var product: array<u32, 8>;
    for (var i = 0u; i < 4u; i += 1u) {
        var carry = 0u;
        for (var j = 0u; j < 4u; j += 1u) {
            let word = a[i] * b[j] + product[i + j] + carry;
            product[i + j] = word & 0xffffu;
            carry = word >> 16u;
        }
        product[i + 4u] = carry;
    }
    // A 106-bit product needs only its high 58 bits and a sticky bit for binary64 rounding.
    let sticky = u32((product[0] | product[1] | product[2]) != 0u);
    let high = vec2u(product[5] | (product[6] << 16u),
        product[3] | (product[4] << 16u) | sticky);
    return round_wide(negative, first.exponent + second.exponent - 1, high);
}

fn exact_winding(a: vec2u, b: vec2u, c: vec2u) -> i32 {
    let left = wide_product(wide_difference(b.x, a.x), wide_difference(c.y, a.y));
    let right = wide_product(wide_difference(b.y, a.y), wide_difference(c.x, a.x));
    if (left.exponent == NAN_EXPONENT || right.exponent == NAN_EXPONENT) { return 0; }
    if (is_wide_zero(left) && is_wide_zero(right)) { return 0; }
    if (left.negative != right.negative) { return select(1, -1, left.negative); }
    let order = compare_magnitude(left, right);
    // Comparing the rounded products determines the sign of their difference.
    return select(order, -order, left.negative);
}

fn in_winding_domain(point: vec2u) -> bool {
    let magnitude = point & vec2u(0x7fffffffu);
    let nonzero = select(magnitude, vec2u(0x3f800000u), magnitude == vec2u(0u));
    return all(nonzero >= vec2u(0x30800000u)) && all(nonzero <= vec2u(0x4e800000u));
}

fn winding_sign(a: vec2u, b: vec2u, c: vec2u) -> i32 {
    if (in_winding_domain(a) && in_winding_domain(b) && in_winding_domain(c)) {
        let ab = bitcast<vec2f>(b) - bitcast<vec2f>(a);
        let ac = bitcast<vec2f>(c) - bitcast<vec2f>(a);
        let products = ab * ac.yx;
        let winding = products.x - products.y;
        // The domain keeps nonzero products normal. This bound covers the rounding of
        // both coordinate differences, both products and the final subtraction.
        if (abs(winding) > (abs(products.x) + abs(products.y)) * 2e-6) {
            return select(-1, 1, winding > 0.);
        }
    }
    return exact_winding(a, b, c);
}
