//! The tagged metadata value of a `.poffo` file (`decode-value.ts`).
//!
//! Each value starts with a one-byte tag. Strings enter a shared dictionary in the order they
//! appear (tags 3, 10 and 12) so later values and keys can reference them (tag 4). Numeric
//! arrays are packed with the element type their tag names.

use serde_json::{Map, Number, Value};

use super::{Budget, corrupt};
use crate::error::FormatError;

/// Deepest nesting the web writes and reads; the root is depth 0.
pub(super) const MAX_DEPTH: usize = 256;

mod tag {
    pub(super) const NULL: u8 = 0;
    pub(super) const FALSE: u8 = 1;
    pub(super) const TRUE: u8 = 2;
    pub(super) const STRING: u8 = 3;
    pub(super) const REFERENCE: u8 = 4;
    pub(super) const NUMBER: u8 = 5;
    pub(super) const FLOAT64: u8 = 6;
    pub(super) const UINT32: u8 = 7;
    pub(super) const FLOAT32: u8 = 8;
    pub(super) const ARRAY: u8 = 9;
    pub(super) const ASSET: u8 = 10;
    pub(super) const OBJECT: u8 = 11;
    pub(super) const ESCAPED: u8 = 12;
    pub(super) const UINT8: u8 = 13;
    pub(super) const UINT16: u8 = 14;
    pub(super) const INT32: u8 = 15;
}

/// A bounded little-endian reader (`createByteReader`).
struct Reader<'a> {
    bytes: &'a [u8],
    offset: usize,
}

impl<'a> Reader<'a> {
    fn take(&mut self, length: usize) -> Result<&'a [u8], FormatError> {
        let end = self
            .offset
            .checked_add(length)
            .filter(|&end| end <= self.bytes.len())
            .ok_or_else(|| corrupt("truncated value"))?;
        let slice = &self.bytes[self.offset..end];
        self.offset = end;
        Ok(slice)
    }

    fn array<const N: usize>(&mut self) -> Result<[u8; N], FormatError> {
        let mut out = [0; N];
        out.copy_from_slice(self.take(N)?);
        Ok(out)
    }

    fn byte(&mut self) -> Result<u8, FormatError> {
        Ok(self.array::<1>()?[0])
    }

    fn u32(&mut self) -> Result<u32, FormatError> {
        self.array().map(u32::from_le_bytes)
    }

    /// An element count, rejected unless that many elements of at least `minimum_bytes` each
    /// fit in the remaining bytes, so no length is trusted before allocating.
    fn length(&mut self, minimum_bytes: usize) -> Result<usize, FormatError> {
        let length = self.u32()? as usize;
        if length > (self.bytes.len() - self.offset) / minimum_bytes {
            return Err(corrupt("invalid value length"));
        }
        Ok(length)
    }

    fn ended(&self) -> bool {
        self.offset == self.bytes.len()
    }
}

fn finite(value: f64) -> Result<Value, FormatError> {
    Number::from_f64(value)
        .map(Value::Number)
        .ok_or_else(|| corrupt("non-finite number"))
}

/// A dictionary entry: its own text, or a restored asset, which is not copied again.
enum Entry {
    Text(String),
    Asset(usize),
}

struct Decoder<'a> {
    reader: Reader<'a>,
    strings: Vec<Entry>,
    assets: Vec<String>,
    budget: &'a mut Budget,
}

/// Bytes one decoded array element occupies, charged before allocating since a one-byte null
/// or `UINT8` element expands to a whole [`Value`].
const ELEMENT_BYTES: usize = size_of::<Value>();
/// Bytes one object entry occupies beyond its key's text: the key's `String` and its value.
const ENTRY_BYTES: usize = size_of::<String>() + size_of::<Value>();

impl Decoder<'_> {
    /// Charges `count` items of `bytes` each to the budget.
    fn reserve(&mut self, count: usize, bytes: usize) -> Result<(), FormatError> {
        self.budget.spend(count.saturating_mul(bytes))
    }

    /// Adds `text` to the dictionary and returns the copy the value keeps.
    fn define(&mut self, text: String) -> Result<String, FormatError> {
        self.budget.spend(text.len())?;
        self.strings.push(Entry::Text(text.clone()));
        Ok(text)
    }

    /// A copy of the string at `index` in the dictionary, charged to the budget since
    /// references are cheap to repeat.
    fn reference(&mut self) -> Result<String, FormatError> {
        let index = self.reader.u32()? as usize;
        let text = match self.strings.get(index) {
            Some(Entry::Text(text)) => text,
            Some(Entry::Asset(asset)) => &self.assets[*asset],
            None => return Err(corrupt("invalid string reference")),
        };
        self.budget.spend(text.len())?;
        Ok(text.clone())
    }

    /// The restored data URL of asset `index`, entered into the dictionary.
    fn asset(&mut self) -> Result<String, FormatError> {
        let index = self.reader.u32()? as usize;
        let url = self
            .assets
            .get(index)
            .ok_or_else(|| corrupt("invalid asset reference"))?;
        self.budget.spend(url.len())?;
        let url = url.clone();
        self.strings.push(Entry::Asset(index));
        Ok(url)
    }

    fn string(&mut self, tag: u8) -> Result<String, FormatError> {
        let length = self.reader.length(1)?;
        let bytes = self.reader.take(length)?;
        // Strict UTF-8; a leading U+FEFF stays part of the value.
        let text = std::str::from_utf8(bytes).map_err(|_| corrupt("invalid UTF-8"))?;
        let text = if tag == tag::ESCAPED {
            json_string_literal(text).ok_or_else(|| corrupt("invalid escaped string"))?
        } else {
            text.to_owned()
        };
        self.define(text)
    }

    fn packed(&mut self, tag: u8) -> Result<Value, FormatError> {
        let width = match tag {
            tag::UINT8 => 1,
            tag::UINT16 => 2,
            tag::UINT32 | tag::INT32 | tag::FLOAT32 => 4,
            tag::FLOAT64 => 8,
            _ => return Err(corrupt("unknown value tag")),
        };
        let length = self.reader.length(width)?;
        self.reserve(length, ELEMENT_BYTES)?;
        let bytes = self.reader.take(length * width)?;
        bytes
            .chunks_exact(width)
            .map(|b| match tag {
                tag::UINT8 => Ok(Value::from(b[0])),
                tag::UINT16 => Ok(Value::from(u16::from_le_bytes([b[0], b[1]]))),
                tag::UINT32 => Ok(Value::from(u32::from_le_bytes([b[0], b[1], b[2], b[3]]))),
                tag::INT32 => Ok(Value::from(i32::from_le_bytes([b[0], b[1], b[2], b[3]]))),
                tag::FLOAT32 => finite(f64::from(f32::from_le_bytes([b[0], b[1], b[2], b[3]]))),
                _ => finite(f64::from_le_bytes([
                    b[0], b[1], b[2], b[3], b[4], b[5], b[6], b[7],
                ])),
            })
            .collect::<Result<_, _>>()
            .map(Value::Array)
    }

    fn value(&mut self, depth: usize) -> Result<Value, FormatError> {
        if depth > MAX_DEPTH {
            return Err(corrupt("value nesting is too deep"));
        }
        let tag = self.reader.byte()?;
        Ok(match tag {
            tag::NULL => Value::Null,
            tag::FALSE => Value::Bool(false),
            tag::TRUE => Value::Bool(true),
            tag::NUMBER => finite(f64::from_le_bytes(self.reader.array()?))?,
            tag::STRING | tag::ESCAPED => Value::String(self.string(tag)?),
            tag::REFERENCE => Value::String(self.reference()?),
            tag::ASSET => Value::String(self.asset()?),
            tag::ARRAY => {
                let length = self.reader.length(1)?;
                self.reserve(length, ELEMENT_BYTES)?;
                let mut items = Vec::with_capacity(length);
                for _ in 0..length {
                    items.push(self.value(depth + 1)?);
                }
                Value::Array(items)
            }
            tag::OBJECT => {
                let length = self.reader.length(2)?;
                self.reserve(length, ENTRY_BYTES)?;
                let mut map = Map::new();
                for _ in 0..length {
                    let Value::String(key) = self.value(depth + 1)? else {
                        return Err(corrupt("object key is not a string"));
                    };
                    if map.contains_key(&key) {
                        return Err(corrupt("duplicate object key"));
                    }
                    let value = self.value(depth + 1)?;
                    map.insert(key, value);
                }
                Value::Object(map)
            }
            other => self.packed(other)?,
        })
    }
}

/// Reads one complete value from the decompressed metadata; `assets` are the restored data
/// URLs in index order.
pub(super) fn decode(
    bytes: &[u8],
    assets: Vec<String>,
    budget: &mut Budget,
) -> Result<Value, FormatError> {
    let mut decoder = Decoder {
        reader: Reader { bytes, offset: 0 },
        strings: Vec::new(),
        assets,
        budget,
    };
    let value = decoder.value(0)?;
    if !decoder.reader.ended() {
        return Err(corrupt("trailing value bytes"));
    }
    Ok(value)
}

/// The text of a JSON string literal (tag 12). A lone UTF-16 surrogate, which the web keeps but
/// a Rust string cannot hold, becomes U+FFFD.
fn json_string_literal(literal: &str) -> Option<String> {
    let inner = literal.strip_prefix('"')?.strip_suffix('"')?;
    let mut out = String::with_capacity(inner.len());
    let mut units: Vec<u16> = Vec::new();
    let flush = |units: &mut Vec<u16>, out: &mut String| {
        out.extend(char::decode_utf16(units.drain(..)).map(|c| c.unwrap_or('\u{FFFD}')));
    };
    let mut chars = inner.chars();
    while let Some(c) = chars.next() {
        if c != '\\' {
            if c == '"' || c < ' ' {
                return None;
            }
            flush(&mut units, &mut out);
            out.push(c);
            continue;
        }
        let escaped = match chars.next()? {
            'u' => {
                let hex: String = chars.by_ref().take(4).collect();
                if hex.len() != 4 || !hex.bytes().all(|b| b.is_ascii_hexdigit()) {
                    return None;
                }
                units.push(u16::from_str_radix(&hex, 16).ok()?);
                continue;
            }
            '"' => '"',
            '\\' => '\\',
            '/' => '/',
            'b' => '\u{8}',
            'f' => '\u{c}',
            'n' => '\n',
            'r' => '\r',
            't' => '\t',
            _ => return None,
        };
        flush(&mut units, &mut out);
        out.push(escaped);
    }
    flush(&mut units, &mut out);
    Some(out)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn escaped_literals_keep_pairs_and_replace_lone_surrogates() {
        assert_eq!(
            json_string_literal(r#""\ud800""#).as_deref(),
            Some("\u{FFFD}")
        );
        assert_eq!(
            json_string_literal(r#""a🐈\n\"""#).as_deref(),
            Some("a🐈\n\"")
        );
        assert_eq!(
            json_string_literal(r#""\udc00\ud800x""#).as_deref(),
            Some("\u{FFFD}\u{FFFD}x")
        );
        assert!(json_string_literal(r#""\x""#).is_none());
        assert!(json_string_literal(r#""\u12""#).is_none());
        assert!(json_string_literal(r#""\u+12f""#).is_none());
        assert!(json_string_literal("unquoted").is_none());
    }

    fn decode_bytes(bytes: &[u8]) -> Result<Value, FormatError> {
        decode(
            bytes,
            vec!["data:a;base64,AA==".into()],
            &mut Budget(1 << 20),
        )
    }

    #[test]
    fn rejects_malformed_values() {
        let cases: [(&str, Vec<u8>); 8] = [
            ("trailing", vec![tag::NULL, 0]),
            ("truncated", vec![tag::NUMBER, 0, 0]),
            ("unknown tag", vec![16]),
            ("string reference", vec![tag::REFERENCE, 0, 0, 0, 0]),
            ("asset reference", vec![tag::ASSET, 1, 0, 0, 0]),
            (
                "non-finite",
                [&[tag::NUMBER][..], &f64::NAN.to_le_bytes()].concat(),
            ),
            (
                "length beyond bytes",
                vec![tag::ARRAY, 2, 0, 0, 0, tag::NULL],
            ),
            (
                "duplicate key",
                vec![
                    tag::OBJECT,
                    2,
                    0,
                    0,
                    0,
                    tag::STRING,
                    1,
                    0,
                    0,
                    0,
                    b'k',
                    tag::NULL,
                    tag::REFERENCE,
                    0,
                    0,
                    0,
                    0,
                    tag::NULL,
                ],
            ),
        ];
        for (name, bytes) in cases {
            assert!(decode_bytes(&bytes).is_err(), "{name}");
        }
    }

    #[test]
    fn nesting_stops_at_the_web_limit() {
        let nested = |depth: usize| {
            let mut bytes = [tag::ARRAY, 1, 0, 0, 0].repeat(depth);
            bytes.push(tag::NULL);
            bytes
        };
        assert!(decode_bytes(&nested(MAX_DEPTH)).is_ok());
        assert!(decode_bytes(&nested(MAX_DEPTH + 1)).is_err());
    }

    #[test]
    fn references_are_charged_to_the_budget() {
        // One 1 KiB string referenced 2000 times would copy 2 MiB.
        let mut bytes = vec![tag::ARRAY];
        bytes.extend_from_slice(&2001u32.to_le_bytes());
        bytes.extend_from_slice(&[tag::STRING]);
        bytes.extend_from_slice(&1024u32.to_le_bytes());
        bytes.extend(std::iter::repeat_n(b'x', 1024));
        for _ in 0..2000 {
            bytes.extend_from_slice(&[tag::REFERENCE, 0, 0, 0, 0]);
        }
        assert!(decode_bytes(&bytes).is_err());
    }

    #[test]
    fn array_elements_are_charged_to_the_budget() {
        // 64 Ki one-byte elements expand to 64 Ki `Value`s (2 MiB), past the 1 MiB budget.
        let count = 64 * 1024u32;
        let mut nulls = vec![tag::ARRAY];
        nulls.extend_from_slice(&count.to_le_bytes());
        nulls.extend(std::iter::repeat_n(tag::NULL, count as usize));
        assert!(decode_bytes(&nulls).is_err());
        let mut bytes = vec![tag::UINT8];
        bytes.extend_from_slice(&count.to_le_bytes());
        bytes.extend(std::iter::repeat_n(0, count as usize));
        assert!(decode_bytes(&bytes).is_err());
        // A small array still fits.
        assert!(decode_bytes(&[tag::UINT8, 2, 0, 0, 0, 1, 2]).is_ok());
    }

    #[test]
    fn packed_arrays_keep_their_exact_values() {
        let mut bytes = vec![tag::FLOAT32, 2, 0, 0, 0];
        bytes.extend_from_slice(&0.5f32.to_le_bytes());
        bytes.extend_from_slice(&(-0.0f32).to_le_bytes());
        let value = decode_bytes(&bytes).expect("float32");
        assert_eq!(value[0], 0.5);
        assert!(
            value[1]
                .as_f64()
                .is_some_and(|v| v == 0.0 && v.is_sign_negative())
        );
        let value = decode_bytes(&[tag::INT32, 1, 0, 0, 0, 0, 0, 0, 0x80]).expect("int32");
        assert_eq!(value[0], i64::from(i32::MIN));
    }
}
