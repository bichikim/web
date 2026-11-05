//! Web-written `.poffo` files (Poffo v1 container, `packages/puppet/src/player/poffo-file`).
//!
//! Layout (little endian): a 64-byte header, then a JSON index, the metadata value and the
//! assets the index lists. Each section is stored raw (codec 0) or as an independent Brotli
//! stream (codec 1) and carries the SHA-256 of its stored bytes. The metadata value is the
//! document's JSON value tree in the tagged encoding read by [`value`]; assets are the bytes of
//! embedded `data:` URLs, restored as `prefix + base64`.
//!
//! Reading rejects anything the web reader rejects (unknown version, flags or codecs, invalid
//! index, checksum or length mismatches, missing or trailing bytes) and anything that would
//! expand past [`DECODED_BUDGET`] bytes.

mod value;

use std::io::Read;

use serde::Deserialize;
use serde_json::Value;
use sha2::{Digest, Sha256};

use crate::base64;
use crate::error::FormatError;

/// `POFFO\r\n\x1a`: identifies the container by content, whatever the file name.
pub const MAGIC: &[u8; 8] = b"POFFO\r\n\x1a";
/// MIME type the web uses for these files.
pub const MIME_TYPE: &str = "application/vnd.poffo";
/// File extension the web uses for these files.
pub const EXTENSION: &str = "poffo";
const VERSION: u16 = 1;
const HEADER_BYTES: usize = 64;
/// Most bytes one file may expand to: decompressed sections, restored data URLs, the text
/// copied for every string reference and the decoded storage of every array element and object
/// entry.
///
/// A string is stored once but copied on each reference, a one-byte element decodes to a whole
/// JSON value, and Brotli expands by up to ~1000×, so a small file could otherwise claim
/// gigabytes. Real documents need a fraction of this (the 21.5 MB development model needs about
/// 150 MB).
pub const DECODED_BUDGET: usize = 512 * 1024 * 1024;
/// The magic of the earlier SDK-only binary encoding, which is no longer read.
const LEGACY_MAGIC: &[u8; 4] = b"POFO";

/// Whether `bytes` start like a web-written `.poffo` file.
pub fn is_container(bytes: &[u8]) -> bool {
    bytes.starts_with(MAGIC)
}

/// Whether `bytes` start like the earlier SDK-only binary encoding.
pub(crate) fn is_legacy_binary(bytes: &[u8]) -> bool {
    bytes.starts_with(LEGACY_MAGIC) && !is_container(bytes)
}

fn corrupt(reason: &'static str) -> FormatError {
    FormatError::Container(reason)
}

/// Bytes still allowed to be produced by this read.
struct Budget(usize);

impl Budget {
    fn spend(&mut self, bytes: usize) -> Result<(), FormatError> {
        self.0 = self
            .0
            .checked_sub(bytes)
            .ok_or_else(|| corrupt("expands beyond the decoding budget"))?;
        Ok(())
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum Codec {
    Raw,
    Brotli,
}

impl Codec {
    fn from_u32(value: u32) -> Option<Self> {
        match value {
            0 => Some(Self::Raw),
            1 => Some(Self::Brotli),
            _ => None,
        }
    }
}

/// A stored section: its codec, stored and decoded lengths and stored-bytes checksum.
#[derive(Debug, Clone, Copy)]
struct Section {
    codec: Codec,
    encoded: usize,
    decoded: usize,
    sha256: [u8; 32],
}

struct Header {
    index_length: usize,
    index_sha256: [u8; 32],
    metadata_codec: Codec,
    metadata_encoded: usize,
    metadata_decoded: usize,
    asset_count: usize,
}

fn u16_at(bytes: &[u8], offset: usize) -> u16 {
    u16::from_le_bytes([bytes[offset], bytes[offset + 1]])
}

fn u32_at(bytes: &[u8], offset: usize) -> u32 {
    u32::from_le_bytes([
        bytes[offset],
        bytes[offset + 1],
        bytes[offset + 2],
        bytes[offset + 3],
    ])
}

/// `decodeHeader`.
fn header(bytes: &[u8]) -> Result<Header, FormatError> {
    let header = bytes
        .get(..HEADER_BYTES)
        .filter(|header| is_container(header))
        .ok_or_else(|| corrupt("not a Poffo v1 file"))?;
    if u16_at(header, 8) != VERSION || u16_at(header, 10) != 0 {
        return Err(corrupt("unsupported version or flags"));
    }
    let codec =
        Codec::from_u32(u32_at(header, 16)).ok_or_else(|| corrupt("unsupported metadata codec"))?;
    let length = |offset| u32_at(header, offset) as usize;
    let mut index_sha256 = [0; 32];
    index_sha256.copy_from_slice(&header[32..64]);
    Ok(Header {
        index_length: length(12),
        index_sha256,
        metadata_codec: codec,
        metadata_encoded: length(20),
        metadata_decoded: length(24),
        asset_count: length(28),
    })
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct RawIndex {
    metadata_sha256: String,
    assets: Vec<RawAsset>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct RawAsset {
    prefix: String,
    codec: f64,
    encoded_length: f64,
    decoded_length: f64,
    sha256: String,
}

/// A whole number that fits in `u32` (`isLength`).
fn length(value: f64) -> Option<usize> {
    (value.fract() == 0.0 && (0.0..=f64::from(u32::MAX)).contains(&value)).then_some(value as usize)
}

/// 64 lowercase hex digits (`isHash`).
fn hash(text: &str) -> Option<[u8; 32]> {
    let digits = text.as_bytes();
    if digits.len() != 64 {
        return None;
    }
    let nibble = |digit: u8| match digit {
        b'0'..=b'9' => Some(digit - b'0'),
        b'a'..=b'f' => Some(digit - b'a' + 10),
        _ => None,
    };
    let mut out = [0; 32];
    for (byte, pair) in out.iter_mut().zip(digits.chunks_exact(2)) {
        *byte = (nibble(pair[0])? << 4) | nibble(pair[1])?;
    }
    Some(out)
}

/// `data:<anything but a comma>;base64,` in any letter case.
fn is_base64_prefix(prefix: &str) -> bool {
    const SUFFIX: &str = ";base64,";
    let Some(media) = prefix
        .get(..5)
        .filter(|scheme| scheme.eq_ignore_ascii_case("data:"))
        .and_then(|_| prefix.get(5..prefix.len().checked_sub(SUFFIX.len())?))
    else {
        return false;
    };
    prefix[5 + media.len()..].eq_ignore_ascii_case(SUFFIX) && !media.contains(',')
}

struct Asset {
    prefix: String,
    section: Section,
}

/// `parseIndex`: the metadata checksum and the asset list, validated before any offsets.
fn index(text: &[u8], asset_count: usize) -> Result<([u8; 32], Vec<Asset>), FormatError> {
    let invalid = || corrupt("invalid asset index");
    let raw: RawIndex = serde_json::from_slice(text).map_err(|_| invalid())?;
    if raw.assets.len() != asset_count {
        return Err(invalid());
    }
    let metadata_hash = hash(&raw.metadata_sha256).ok_or_else(invalid)?;
    let assets = raw
        .assets
        .into_iter()
        .map(|asset| {
            let codec = length(asset.codec)
                .and_then(|c| Codec::from_u32(c as u32))
                .ok_or_else(invalid)?;
            let (encoded, decoded) = length(asset.encoded_length)
                .zip(length(asset.decoded_length))
                .ok_or_else(invalid)?;
            let sha256 = hash(&asset.sha256).ok_or_else(invalid)?;
            if !is_base64_prefix(&asset.prefix) || (codec == Codec::Raw && encoded != decoded) {
                return Err(invalid());
            }
            Ok(Asset {
                prefix: asset.prefix,
                section: Section {
                    codec,
                    encoded,
                    decoded,
                    sha256,
                },
            })
        })
        .collect::<Result<_, _>>()?;
    Ok((metadata_hash, assets))
}

fn checked<'a>(stored: &'a [u8], sha256: &[u8; 32]) -> Result<&'a [u8], FormatError> {
    if Sha256::digest(stored).as_slice() == sha256 {
        Ok(stored)
    } else {
        Err(corrupt("section checksum mismatch"))
    }
}

/// `decodeSection`: exactly `section.decoded` bytes, never allocating more than were produced.
fn decode_section(
    stored: &[u8],
    section: Section,
    budget: &mut Budget,
) -> Result<Vec<u8>, FormatError> {
    budget.spend(section.decoded)?;
    let bytes = match section.codec {
        Codec::Raw => stored.to_vec(),
        Codec::Brotli => {
            const BUFFER: usize = 64 * 1024;
            let mut out = Vec::new();
            // One byte past the declared length reveals a section that decodes longer.
            brotli_decompressor::Decompressor::new(stored, BUFFER)
                .take(section.decoded as u64 + 1)
                .read_to_end(&mut out)
                .map_err(|_| corrupt("invalid Brotli section"))?;
            out
        }
    };
    if bytes.len() != section.decoded {
        return Err(corrupt("section length differs from its decoded length"));
    }
    Ok(bytes)
}

/// `decodeFile`: the document's JSON value tree, after checking every offset, checksum and
/// length.
pub fn decode(bytes: &[u8]) -> Result<Value, FormatError> {
    let header = header(bytes)?;
    let mut budget = Budget(DECODED_BUDGET);
    let truncated = || corrupt("truncated file");
    let index_end = HEADER_BYTES
        .checked_add(header.index_length)
        .ok_or_else(truncated)?;
    let metadata_end = index_end
        .checked_add(header.metadata_encoded)
        .ok_or_else(truncated)?;
    if metadata_end > bytes.len()
        || (header.metadata_codec == Codec::Raw
            && header.metadata_encoded != header.metadata_decoded)
    {
        return Err(truncated());
    }
    let index_bytes = checked(&bytes[HEADER_BYTES..index_end], &header.index_sha256)?;
    let (metadata_sha256, assets) = index(index_bytes, header.asset_count)?;
    let expected = assets.iter().try_fold(metadata_end, |end, asset| {
        end.checked_add(asset.section.encoded)
    });
    if expected != Some(bytes.len()) {
        return Err(corrupt("truncated or trailing asset bytes"));
    }
    let metadata = Section {
        codec: header.metadata_codec,
        encoded: header.metadata_encoded,
        decoded: header.metadata_decoded,
        sha256: metadata_sha256,
    };
    let stored = checked(&bytes[index_end..metadata_end], &metadata.sha256)?;
    let metadata = decode_section(stored, metadata, &mut budget)?;
    let mut offset = metadata_end;
    let mut urls = Vec::with_capacity(assets.len());
    // One asset at a time, so only its decoded bytes and data URL are held together.
    for asset in assets {
        let end = offset + asset.section.encoded;
        let stored = checked(&bytes[offset..end], &asset.section.sha256)?;
        let decoded = decode_section(stored, asset.section, &mut budget)?;
        budget.spend(asset.prefix.len() + decoded.len().div_ceil(3) * 4)?;
        let mut url = asset.prefix;
        url.push_str(&base64::encode(&decoded));
        urls.push(url);
        offset = end;
    }
    value::decode(&metadata, urls, &mut budget)
}
