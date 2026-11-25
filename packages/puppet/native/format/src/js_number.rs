//! Numbers as JavaScript sees them. Documents are written by JavaScript, so `1.0` is the integer
//! 1 and `-0` is 0, and the typed document reads them that way from every file format.

use serde_json::{Number, Value};

/// 2^53: integers below it are exact JavaScript integers.
const SAFE_INTEGER: f64 = 9_007_199_254_740_992.0;

fn number_value(number: &Number) -> f64 {
    number.as_f64().unwrap_or(0.0)
}

fn is_safe_integer(value: f64) -> bool {
    value.fract() == 0.0 && value.abs() < SAFE_INTEGER
}

/// The JSON number `JSON.stringify` would write for `value`.
fn javascript_number(value: f64) -> Value {
    if is_safe_integer(value) {
        if value >= 0.0 {
            Value::from(value as u64)
        } else {
            Value::from(value as i64)
        }
    } else {
        Number::from_f64(value).map_or(Value::Null, Value::Number)
    }
}

/// Rewrites every number the way JavaScript would serialize it, for value comparisons.
pub fn canonicalize(value: &Value) -> Value {
    let mut copy = value.clone();
    canonicalize_in_place(&mut copy);
    copy
}

/// [`canonicalize`] without copying the strings, which hold most of a document's bytes.
pub fn canonicalize_in_place(value: &mut Value) {
    match value {
        Value::Number(n) => {
            let number = javascript_number(number_value(n));
            *value = number;
        }
        Value::Array(items) => items.iter_mut().for_each(canonicalize_in_place),
        Value::Object(map) => map.values_mut().for_each(canonicalize_in_place),
        Value::Null | Value::Bool(_) | Value::String(_) => {}
    }
}

#[cfg(test)]
mod tests {
    use serde_json::json;

    use super::*;

    #[test]
    fn integral_floats_and_negative_zero_become_integers() {
        assert_eq!(
            canonicalize(&json!([1.0, 2.5, -0.0, -3.0, 1e300])),
            json!([1, 2.5, 0, -3, 1e300])
        );
    }
}
