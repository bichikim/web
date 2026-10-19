import {describe, expect, test} from 'vitest'

import {decodeWav, readWavHeader} from '../decode-wav'
import {encodeWav} from './support/encode-wav'

const RAMP = [-1, -0.5, -0.25, 0, 0.25, 0.5, 0.75]

const decode = (bytes: Uint8Array) => {
  const result = decodeWav(bytes)
  if (!result.ok) {
    throw new Error(result.error)
  }
  return result.sound
}

describe('decodeWav', () => {
  test.each([8, 16, 24, 32] as const)('should decode %i-bit PCM within one step', (bits) => {
    const sound = decode(encodeWav({bits, channels: [RAMP], sampleRate: 8000}))
    expect(sound.sampleRate).toBe(8000)
    expect(sound.channels).toHaveLength(1)
    const step = 1 / 2 ** (bits - 1)
    for (const [index, value] of RAMP.entries()) {
      expect(Math.abs(sound.mono[index]! - value)).toBeLessThanOrEqual(step)
    }
  })

  test('should decode float and extensible files and mix channels to mono', () => {
    const right = RAMP.map((value) => -value / 2)
    const float = decode(
      encodeWav({channels: [RAMP, right], extensible: true, float: true, sampleRate: 44_100}),
    )
    expect([...float.channels[0]!]).toEqual(RAMP)
    expect([...float.channels[1]!]).toEqual(right)
    expect([...float.mono]).toEqual(RAMP.map((value) => Math.fround(value / 4)))
    const pcm = decode(
      encodeWav({bits: 24, channels: [RAMP], extensible: true, sampleRate: 48_000}),
    )
    expect(pcm.mono[1]).toBe(-0.5)
  })

  test('should skip unknown, odd-sized chunks and keep whole frames of a truncated file', () => {
    const bytes = encodeWav({
      channels: [RAMP, RAMP],
      extraChunks: [{id: 'LIST', size: 3}],
      sampleRate: 8000,
    })
    expect(decode(bytes).mono).toHaveLength(RAMP.length)
    // Cut one byte off the last sample frame.
    expect(decode(bytes.subarray(0, -1)).mono).toHaveLength(RAMP.length - 1)
  })

  test('should report files it cannot decode', () => {
    const wav = encodeWav({channels: [RAMP], sampleRate: 8000})
    expect(decodeWav(new Uint8Array(8))).toEqual({error: 'not-wav', ok: false})
    expect(decodeWav(wav.subarray(0, 12))).toEqual({error: 'missing-format', ok: false})
    expect(decodeWav(wav.subarray(0, 36))).toEqual({error: 'missing-data', ok: false})
    const adpcm = wav.slice()
    new DataView(adpcm.buffer).setUint16(20, 2, true)
    expect(decodeWav(adpcm)).toEqual({error: 'unsupported-encoding', ok: false})
    const silent = wav.slice()
    new DataView(silent.buffer).setUint32(24, 0, true)
    expect(decodeWav(silent)).toEqual({error: 'invalid-format', ok: false})
  })

  test('should refuse sample rates and channel counts Web Audio cannot play', () => {
    const at = (sampleRate: number, channels = 1) =>
      decodeWav(encodeWav({channels: Array.from({length: channels}, () => RAMP), sampleRate}))
    expect(at(2000)).toEqual({error: 'unsupported-encoding', ok: false})
    expect(at(800_000)).toEqual({error: 'unsupported-encoding', ok: false})
    expect(at(8000, 33)).toEqual({error: 'unsupported-encoding', ok: false})
    expect(at(3000).ok).toBe(true)
    expect(at(8000, 32).ok).toBe(true)
  })

  test('should read the same validity and length from the header as decoding', () => {
    const wav = encodeWav({channels: [RAMP], sampleRate: 8000})
    const stereo = encodeWav({
      channels: [RAMP, RAMP],
      extraChunks: [{id: 'LIST', size: 3}],
      sampleRate: 8000,
    })
    const patched = (offset: number, value: number, size: 16 | 32) => {
      const bytes = wav.slice()
      const view = new DataView(bytes.buffer)
      if (size === 16) {
        view.setUint16(offset, value, true)
      } else {
        view.setUint32(offset, value, true)
      }
      return bytes
    }
    const fixtures = [
      ...([8, 16, 24, 32] as const).map((bits) =>
        encodeWav({bits, channels: [RAMP], sampleRate: 8000}),
      ),
      encodeWav({channels: [RAMP, RAMP], extensible: true, float: true, sampleRate: 44_100}),
      encodeWav({bits: 24, channels: [RAMP], extensible: true, sampleRate: 48_000}),
      stereo,
      stereo.subarray(0, -1),
      new Uint8Array(8),
      wav.subarray(0, 12),
      wav.subarray(0, 36),
      patched(20, 2, 16),
      patched(24, 0, 32),
      encodeWav({channels: [RAMP], sampleRate: 2000}),
      encodeWav({channels: [RAMP], sampleRate: 800_000}),
      encodeWav({channels: Array.from({length: 33}, () => RAMP), sampleRate: 8000}),
      encodeWav({channels: Array.from({length: 32}, () => RAMP), sampleRate: 3000}),
    ]
    for (const bytes of fixtures) {
      const decoded = decodeWav(bytes)
      const header = readWavHeader(bytes)
      if (decoded.ok && header.ok) {
        expect(header.header).toMatchObject({
          channels: decoded.sound.channels.length,
          duration: decoded.sound.mono.length / decoded.sound.sampleRate,
          frames: decoded.sound.mono.length,
          sampleRate: decoded.sound.sampleRate,
        })
      } else {
        expect(header).toEqual(decoded)
      }
    }
    // Both outcomes are covered.
    expect(fixtures.filter((bytes) => readWavHeader(bytes).ok)).toHaveLength(9)
  })
})
