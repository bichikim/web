//! Motion sounds: WAV decoding (`player/audio/decode-wav.ts`) and the mouth they drive
//! (`player/audio/motion-sound-mouth.ts`).

use crate::motion::MotionFrame;
use crate::voice::{AnalyzeVowelsOptions, VowelWeights, analyze_vowels, measure_voice_level};

const RIFF_HEADER: usize = 12;
const CHUNK_HEADER: usize = 8;
const FORMAT_MINIMUM: usize = 16;
const EXTENSIBLE_MINIMUM: usize = 26;
const EXTENSIBLE_SUBFORMAT_OFFSET: usize = 24;
const PCM: u16 = 1;
const FLOAT: u16 = 3;
const EXTENSIBLE: u16 = 0xfffe;

/// A decoded WAV file: per-channel samples in -1..=1 and their mono mix for analysis.
#[derive(Debug, Clone, PartialEq)]
pub struct Sound {
    pub sample_rate: u32,
    pub channels: Vec<Vec<f32>>,
    /// Average of the channels, computed in `f64` and rounded to `f32` as the web player does.
    pub mono: Vec<f32>,
}

impl Sound {
    /// Length in seconds.
    pub fn duration(&self) -> f64 {
        self.mono.len() as f64 / f64::from(self.sample_rate)
    }
}

/// Web Audio's channel and sample-rate limits (`decodeWav`).
const MAX_CHANNELS: u16 = 32;
const SAMPLE_RATES: std::ops::RangeInclusive<u32> = 3000..=768_000;

/// Why a WAV file could not be decoded.
#[derive(Debug, Clone, Copy, PartialEq, Eq, thiserror::Error)]
pub enum WavError {
    #[error("not a RIFF WAVE file")]
    NotWav,
    #[error("the WAV file has no format chunk")]
    MissingFormat,
    #[error("the WAV file has no data chunk")]
    MissingData,
    #[error("only linear PCM (8, 16, 24, 32-bit) and 32-bit float WAV files are supported")]
    UnsupportedEncoding,
    #[error("the WAV file has no channels or a zero sample rate")]
    InvalidFormat,
}

struct Format {
    encoding: u16,
    channels: u16,
    sample_rate: u32,
    bits: u16,
}

fn u16_at(bytes: &[u8], offset: usize) -> Option<u16> {
    Some(u16::from_le_bytes(
        bytes.get(offset..offset + 2)?.try_into().ok()?,
    ))
}

fn u32_at(bytes: &[u8], offset: usize) -> Option<u32> {
    Some(u32::from_le_bytes(
        bytes.get(offset..offset + 4)?.try_into().ok()?,
    ))
}

fn read_format(body: &[u8]) -> Option<Format> {
    if body.len() < FORMAT_MINIMUM {
        return None;
    }
    let tag = u16_at(body, 0)?;
    let encoding = if tag == EXTENSIBLE && body.len() >= EXTENSIBLE_MINIMUM {
        u16_at(body, EXTENSIBLE_SUBFORMAT_OFFSET)?
    } else {
        tag
    };
    Some(Format {
        encoding,
        channels: u16_at(body, 2)?,
        sample_rate: u32_at(body, 4)?,
        bits: u16_at(body, 14)?,
    })
}

/// The first `fmt ` and `data` chunk bodies; chunks are word aligned and a truncated chunk keeps
/// the bytes present.
fn find_chunks(bytes: &[u8]) -> (Option<&[u8]>, Option<&[u8]>) {
    let (mut format, mut data) = (None, None);
    let mut offset = RIFF_HEADER;
    while offset + CHUNK_HEADER <= bytes.len() {
        let size = u32_at(bytes, offset + 4).map_or(0, |size| size as usize);
        let body = offset + CHUNK_HEADER;
        let chunk = &bytes[body..body.saturating_add(size).min(bytes.len())];
        match &bytes[offset..offset + 4] {
            b"fmt " => format = format.or(Some(chunk)),
            b"data" => data = data.or(Some(chunk)),
            _ => {}
        }
        offset = body.saturating_add(size).saturating_add(size % 2);
    }
    (format, data)
}

/// One sample as -1..=1; integer scales are powers of two, so up to 24 bits it is exact in `f32`.
fn sample(bytes: &[u8], format: &Format) -> f64 {
    if format.encoding == FLOAT {
        return f64::from(f32::from_le_bytes([bytes[0], bytes[1], bytes[2], bytes[3]]));
    }
    let scale = f64::from(1u32 << (format.bits - 1));
    match format.bits {
        8 => (f64::from(bytes[0]) - 128.0) / 128.0,
        16 => f64::from(i16::from_le_bytes([bytes[0], bytes[1]])) / scale,
        24 => {
            let unsigned = f64::from(u32::from(bytes[0]) | u32::from(bytes[1]) << 8)
                + f64::from(bytes[2]) * 65_536.0;
            (if unsigned >= scale {
                unsigned - 2.0 * scale
            } else {
                unsigned
            }) / scale
        }
        _ => f64::from(i32::from_le_bytes([bytes[0], bytes[1], bytes[2], bytes[3]])) / scale,
    }
}

/// Decodes a linear PCM (8-bit unsigned, 16/24/32-bit signed) or 32-bit float WAV file,
/// including `WAVE_FORMAT_EXTENSIBLE`. A truncated data chunk keeps its whole sample frames.
pub fn decode_wav(bytes: &[u8]) -> Result<Sound, WavError> {
    if bytes.len() < RIFF_HEADER || &bytes[0..4] != b"RIFF" || &bytes[8..12] != b"WAVE" {
        return Err(WavError::NotWav);
    }
    let (format, data) = find_chunks(bytes);
    let format = format
        .and_then(read_format)
        .ok_or(WavError::MissingFormat)?;
    let supported = (format.encoding == PCM && matches!(format.bits, 8 | 16 | 24 | 32))
        || (format.encoding == FLOAT && format.bits == 32);
    if !supported {
        return Err(WavError::UnsupportedEncoding);
    }
    if format.channels == 0 || format.sample_rate == 0 {
        return Err(WavError::InvalidFormat);
    }
    // Web Audio's `createBuffer` limits, so files play on every platform (`decodeWav`).
    if format.channels > MAX_CHANNELS || !SAMPLE_RATES.contains(&format.sample_rate) {
        return Err(WavError::UnsupportedEncoding);
    }
    let data = data.ok_or(WavError::MissingData)?;
    let sample_bytes = usize::from(format.bits / 8);
    let frame_bytes = sample_bytes * usize::from(format.channels);
    let frames: Vec<&[u8]> = data.chunks_exact(frame_bytes).collect();
    let channels: Vec<Vec<f32>> = (0..usize::from(format.channels))
        .map(|channel| {
            frames
                .iter()
                .map(|frame| sample(&frame[channel * sample_bytes..], &format) as f32)
                .collect()
        })
        .collect();
    let mono = if channels.len() == 1 {
        channels[0].clone()
    } else {
        (0..frames.len())
            .map(|frame| {
                let sum: f64 = channels.iter().map(|c| f64::from(c[frame])).sum();
                (sum / channels.len() as f64) as f32
            })
            .collect()
    };
    Ok(Sound {
        sample_rate: format.sample_rate,
        channels,
        mono,
    })
}

/// Seconds of sound before the motion time that one frame analyzes (`MOTION_SOUND_WINDOW`).
pub const MOTION_SOUND_WINDOW: f64 = 0.05;

/// The mouth that playing motion sounds ask for (`MotionSoundMouth`).
#[derive(Debug, Clone, Copy, PartialEq)]
pub(crate) struct MotionSoundMouth {
    /// Loudness 0..=1 for documents without mouth shapes.
    pub(crate) level: f64,
    /// Vowel weights for the document's mouth shapes.
    pub(crate) weights: VowelWeights,
}

/// Samples in the analysis window ending at `time`; `None` once the sound has ended
/// (`getMotionSoundWindow`).
pub fn motion_sound_window(sound: &Sound, time: f64) -> Option<&[f32]> {
    let rate = f64::from(sound.sample_rate);
    if time.is_nan() || time < 0.0 || time >= sound.duration() {
        return None;
    }
    let end = ((time * rate).floor() as usize).min(sound.mono.len());
    let start = end.saturating_sub((MOTION_SOUND_WINDOW * rate).round() as usize);
    sound.mono.get(start..end)
}

/// Each frame's motion sound analyzed at the frame's motion time, summed by the frames' weights;
/// `None` when no frame's sound is loaded and still lasting (`getMotionSoundMouth`).
pub(crate) fn motion_sound_mouth<'a>(
    frames: &[MotionFrame],
    sound: impl Fn(usize) -> Option<&'a Sound>,
    motions: &[poffo_format::document::Motion],
    delta: f64,
) -> Option<MotionSoundMouth> {
    let mut sounding = false;
    let mut level = 0.0;
    let mut weights = [0.0; 5];
    for frame in frames {
        let Some(sound) = sound(frame.motion) else {
            continue;
        };
        let rms = motions
            .get(frame.motion)
            .and_then(|m| m.sound.as_ref())
            .is_some_and(|s| s.analysis == Some(poffo_format::document::SoundAnalysis::Rms));
        if rms {
            let duration = if delta > 0.0 && frame.rate > 0.0 {
                delta * frame.rate
            } else {
                1.0 / 60.0
            };
            if let Some(value) = sound_rms(sound, frame.time, duration) {
                sounding = true;
                level += value;
            }
        }
        let Some(samples) = motion_sound_window(sound, frame.time) else {
            continue;
        };
        sounding = true;
        let options = AnalyzeVowelsOptions::default();
        let analysis = analyze_vowels(samples, f64::from(sound.sample_rate), options);
        if !rms {
            level += frame.weight * measure_voice_level(samples, options);
        }
        for (total, weight) in weights.iter_mut().zip(analysis.weights) {
            *total += frame.weight * weight;
        }
    }
    sounding.then_some(MotionSoundMouth {
        level: level.min(1.0),
        weights,
    })
}

/// Channel RMS over the elapsed motion interval, including the final partial frame.
fn sound_rms(sound: &Sound, time: f64, duration: f64) -> Option<f64> {
    let start = ((time - duration) * f64::from(sound.sample_rate))
        .floor()
        .max(0.0) as usize;
    let end = (time * f64::from(sound.sample_rate)).floor().max(0.0) as usize;
    if time < 0.0 || start >= sound.mono.len() {
        return None;
    }
    let limit = end.min(sound.mono.len());
    if limit <= start {
        return Some(0.0);
    }
    let power: f64 = sound
        .channels
        .iter()
        .map(|channel| {
            channel[start..limit]
                .iter()
                .map(|&v| f64::from(v).powi(2))
                .sum::<f64>()
        })
        .sum();
    Some((power / (sound.channels.len() * (limit - start)) as f64).sqrt())
}
