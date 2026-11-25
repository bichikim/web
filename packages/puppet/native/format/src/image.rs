//! Bounded PNG decoding into straight-alpha RGBA8 (feature `png`).
//!
//! Model files are untrusted: a PNG header may declare up to 2³¹−1 × 2³¹−1 pixels in a few
//! dozen bytes. [`decode_png`] checks the declared size against [`MAX_PIXELS`] before
//! allocating, and allocates fallibly, so a hostile header yields an error instead of a
//! process abort.

use std::collections::TryReserveError;
use std::io::Cursor;

/// Largest image accepted, in pixels: 8192×8192 (256 MiB of RGBA8 output) still admits large
/// atlases, while a header's declared size no longer decides how much is allocated. Shared
/// with other decoders of model textures (e.g. TGA) so every format has the same ceiling.
pub const MAX_PIXELS: usize = 8192 * 8192;

/// Straight-alpha RGBA8 pixels, rows top to bottom; `rgba.len() == width × height × 4`.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct RgbaImage {
    pub width: u32,
    pub height: u32,
    pub rgba: Vec<u8>,
}

#[derive(Debug, thiserror::Error)]
pub enum ImageError {
    #[error("PNG decoding failed: {0}")]
    Png(#[from] png::DecodingError),
    #[error("a {width}x{height} image exceeds the {MAX_PIXELS}-pixel limit")]
    TooLarge { width: u32, height: u32 },
    #[error("cannot allocate {bytes} bytes for a decoded image")]
    Allocation {
        bytes: usize,
        #[source]
        source: TryReserveError,
    },
    /// The decoder produced a layout the expansion transformations rule out (e.g. palette).
    #[error("PNG decoded to unsupported {color:?} {depth:?} output")]
    UnsupportedOutput {
        color: png::ColorType,
        depth: png::BitDepth,
    },
}

/// `width × height` when it is at most [`MAX_PIXELS`].
pub fn checked_pixels(width: u32, height: u32) -> Result<usize, ImageError> {
    usize::try_from(u64::from(width) * u64::from(height))
        .ok()
        .filter(|&pixels| pixels <= MAX_PIXELS)
        .ok_or(ImageError::TooLarge { width, height })
}

/// Decodes a PNG of any color type and bit depth into straight-alpha RGBA8 (palette and
/// low bit depths expanded, 16-bit channels truncated, gray replicated, missing alpha 255).
/// Fails before allocating pixel memory when the header exceeds [`MAX_PIXELS`].
pub fn decode_png(bytes: &[u8]) -> Result<RgbaImage, ImageError> {
    let mut decoder = png::Decoder::new(Cursor::new(bytes));
    decoder.set_transformations(png::Transformations::EXPAND | png::Transformations::STRIP_16);
    let mut reader = decoder.read_info()?;
    let (width, height) = reader.info().size();
    let rgba_len = checked_pixels(width, height)? * 4;
    // Every expanded 8-bit output has at most 4 bytes per pixel, so the frame fits in the
    // RGBA buffer and is widened in place, with one allocation.
    let frame_len = reader
        .output_buffer_size()
        .filter(|&len| len <= rgba_len)
        .ok_or(ImageError::TooLarge { width, height })?;
    let mut rgba = Vec::new();
    rgba.try_reserve_exact(rgba_len)
        .map_err(|source| ImageError::Allocation {
            bytes: rgba_len,
            source,
        })?;
    rgba.resize(rgba_len, 0);
    let info = reader.next_frame(&mut rgba[..frame_len])?;
    let channels = match (info.color_type, info.bit_depth) {
        (png::ColorType::Rgba, png::BitDepth::Eight) => 4,
        (png::ColorType::Rgb, png::BitDepth::Eight) => 3,
        (png::ColorType::GrayscaleAlpha, png::BitDepth::Eight) => 2,
        (png::ColorType::Grayscale, png::BitDepth::Eight) => 1,
        (color, depth) => return Err(ImageError::UnsupportedOutput { color, depth }),
    };
    widen_to_rgba(&mut rgba, channels);
    Ok(RgbaImage {
        width,
        height,
        rgba,
    })
}

/// Widens the `channels`-byte pixels packed at the start of `rgba` to RGBA8 in place.
fn widen_to_rgba(rgba: &mut [u8], channels: usize) {
    if channels == 4 {
        return;
    }
    // Back to front: pixel `i` moves from `channels·i` to `4·i`, never over a pixel `< i`
    // that has not been moved yet.
    for i in (0..rgba.len() / 4).rev() {
        let p = &rgba[channels * i..channels * (i + 1)];
        let texel = match *p {
            [r, g, b] => [r, g, b, 255],
            [g, a] => [g, g, g, a],
            [g] => [g, g, g, 255],
            _ => return,
        };
        rgba[4 * i..4 * (i + 1)].copy_from_slice(&texel);
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn encode(width: u32, height: u32, color: png::ColorType, data: &[u8]) -> Vec<u8> {
        let mut bytes = Vec::new();
        let mut encoder = png::Encoder::new(&mut bytes, width, height);
        encoder.set_color(color);
        encoder.set_depth(png::BitDepth::Eight);
        let mut writer = encoder.write_header().expect("header");
        writer.write_image_data(data).expect("data");
        writer.finish().expect("finish");
        bytes
    }

    #[test]
    fn widens_every_color_type_to_rgba() {
        let cases: [(png::ColorType, &[u8], [u8; 8]); 4] = [
            (
                png::ColorType::Rgb,
                &[1, 2, 3, 4, 5, 6],
                [1, 2, 3, 255, 4, 5, 6, 255],
            ),
            (
                png::ColorType::Rgba,
                &[1, 2, 3, 4, 5, 6, 7, 8],
                [1, 2, 3, 4, 5, 6, 7, 8],
            ),
            (
                png::ColorType::GrayscaleAlpha,
                &[9, 10, 11, 12],
                [9, 9, 9, 10, 11, 11, 11, 12],
            ),
            (
                png::ColorType::Grayscale,
                &[7, 8],
                [7, 7, 7, 255, 8, 8, 8, 255],
            ),
        ];
        for (color, data, expected) in cases {
            let decoded = decode_png(&encode(2, 1, color, data)).expect("decode");
            assert_eq!((decoded.width, decoded.height), (2, 1));
            assert_eq!(decoded.rgba, expected, "{color:?}");
        }
        assert!(matches!(decode_png(b"not a png"), Err(ImageError::Png(_))));
    }

    /// PNG CRC-32 (ISO 3309), bitwise.
    fn crc32(bytes: &[u8]) -> u32 {
        !bytes.iter().fold(!0u32, |crc, &byte| {
            (0..8).fold(crc ^ u32::from(byte), |c, _| {
                (c >> 1) ^ (0xEDB8_8320 & (c & 1).wrapping_neg())
            })
        })
    }

    fn chunk(kind: &[u8; 4], data: &[u8]) -> Vec<u8> {
        let body = [kind.as_slice(), data].concat();
        let length = u32::try_from(data.len())
            .expect("small chunk")
            .to_be_bytes();
        [&length[..], &body, &crc32(&body).to_be_bytes()].concat()
    }

    /// A 65-byte RGBA PNG declaring `width × height` pixels with an empty zlib stream.
    fn header_only(width: u32, height: u32) -> Vec<u8> {
        let ihdr = [
            &width.to_be_bytes()[..],
            &height.to_be_bytes(),
            &[8, 6, 0, 0, 0],
        ]
        .concat();
        let empty_zlib = [0x78, 0x9c, 0x03, 0x00, 0x00, 0x00, 0x00, 0x01];
        [
            &b"\x89PNG\r\n\x1a\n"[..],
            &chunk(b"IHDR", &ihdr),
            &chunk(b"IDAT", &empty_zlib),
            &chunk(b"IEND", &[]),
        ]
        .concat()
    }

    /// Regression: the declared size used to be allocated before any pixel data was read, so
    /// this header aborted the process (an uncatchable allocation failure).
    #[test]
    fn oversized_headers_fail_before_allocating() {
        let bytes = header_only(4_000_000, 2_000_000_000);
        assert_eq!(bytes.len(), 65);
        assert!(matches!(
            decode_png(&bytes),
            Err(ImageError::TooLarge {
                width: 4_000_000,
                height: 2_000_000_000
            })
        ));
        // 12000² (549 MiB of RGBA) is over the cap even though it fits in memory.
        assert!(matches!(
            decode_png(&header_only(12_000, 12_000)),
            Err(ImageError::TooLarge { .. })
        ));
        // Within the cap, the same truncated stream is an ordinary decoding error.
        assert!(matches!(
            decode_png(&header_only(4, 4)),
            Err(ImageError::Png(_))
        ));
        assert_eq!(checked_pixels(8192, 8192).ok(), Some(MAX_PIXELS));
        assert!(checked_pixels(8192, 8193).is_err());
        assert!(checked_pixels(u32::MAX, u32::MAX).is_err());
    }
}
