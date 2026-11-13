//! Standard (RFC 4648, padded) base64, as produced by browsers for `data:` URLs.

const ALPHABET: &[u8; 64] = b"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

pub fn encode(bytes: &[u8]) -> String {
    let mut out = String::with_capacity(bytes.len().div_ceil(3) * 4);
    for chunk in bytes.chunks(3) {
        let b = [
            chunk[0],
            *chunk.get(1).unwrap_or(&0),
            *chunk.get(2).unwrap_or(&0),
        ];
        let n = (u32::from(b[0]) << 16) | (u32::from(b[1]) << 8) | u32::from(b[2]);
        let symbols =
            [n >> 18, n >> 12, n >> 6, n].map(|v| char::from(ALPHABET[(v & 63) as usize]));
        let kept = chunk.len() + 1;
        for (i, symbol) in symbols.into_iter().enumerate() {
            out.push(if i < kept { symbol } else { '=' });
        }
    }
    out
}

fn value(symbol: u8) -> Option<u32> {
    Some(match symbol {
        b'A'..=b'Z' => symbol - b'A',
        b'a'..=b'z' => symbol - b'a' + 26,
        b'0'..=b'9' => symbol - b'0' + 52,
        b'+' => 62,
        b'/' => 63,
        _ => return None,
    } as u32)
}

/// Strict decoding: rejects whitespace, bad padding and non-alphabet symbols.
pub fn decode(text: &str) -> Option<Vec<u8>> {
    let bytes = text.as_bytes();
    if !bytes.len().is_multiple_of(4) {
        return None;
    }
    let mut out = Vec::with_capacity(bytes.len() / 4 * 3);
    let chunk_count = bytes.len() / 4;
    for (index, chunk) in bytes.chunks(4).enumerate() {
        let padding = chunk.iter().rev().take_while(|&&c| c == b'=').count();
        if padding > 2 || (padding > 0 && index + 1 != chunk_count) {
            return None;
        }
        let mut n = 0u32;
        for (i, &symbol) in chunk.iter().enumerate() {
            let v = if i >= 4 - padding { 0 } else { value(symbol)? };
            n = (n << 6) | v;
        }
        let decoded = [(n >> 16) as u8, (n >> 8) as u8, n as u8];
        out.extend_from_slice(&decoded[..3 - padding]);
    }
    Some(out)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn round_trips_all_padding_lengths() {
        for len in 0..10u8 {
            let data: Vec<u8> = (0..len).map(|i| i.wrapping_mul(37)).collect();
            let text = encode(&data);
            assert_eq!(decode(&text).as_deref(), Some(&data[..]), "{text}");
        }
        assert_eq!(encode(b"Man"), "TWFu");
        assert_eq!(encode(b"Ma"), "TWE=");
        assert_eq!(decode("TW=u"), None);
        assert_eq!(decode("TWFu\n"), None);
    }
}
