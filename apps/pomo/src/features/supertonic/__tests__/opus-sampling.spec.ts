/** @vitest-environment node */
import {createHash} from 'node:crypto'
import {describe, expect, it} from 'vitest'

import {getOpusEncodingInput} from '../opus-sampling'

describe('getOpusEncodingInput', () => {
  it.each([Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY, 0, -1])(
    'should reject an invalid sample rate of %s',
    (sampleRate) => {
      expect(() => getOpusEncodingInput(new Float32Array(), sampleRate)).toThrow(
        `Invalid audio sample rate: ${sampleRate}`,
      )
    },
  )

  it.each([8000, 12_000, 16_000, 24_000, 48_000])(
    'should borrow PCM at the Opus-native sample rate %i',
    (sampleRate) => {
      const samples = new Float32Array([0, 0.5, 1])

      const result = getOpusEncodingInput(samples, sampleRate)
      expect(result.sampleRate).toBe(sampleRate)
      expect(result.samples).toBe(samples)
    },
  )

  it('should linearly resample legacy PCM to 48 kHz', () => {
    const result = getOpusEncodingInput(new Float32Array([0, 1]), 32_000)

    expect(result.sampleRate).toBe(48_000)
    expect(result.samples).toHaveLength(3)
    expect(result.samples[0]).toBe(0)
    expect(result.samples[1]).toBeCloseTo(2 / 3)
    expect(result.samples[2]).toBe(1)
  })

  it('should retain non-empty legacy PCM when the resampled length rounds to zero', () => {
    const result = getOpusEncodingInput(new Float32Array([0.25, -0.5, 0.75]), 384_000)

    expect(result.sampleRate).toBe(48_000)
    expect(result.samples).toEqual(new Float32Array([0.25]))
  })

  it('should preserve an empty legacy PCM buffer', () => {
    expect(getOpusEncodingInput(new Float32Array(), 44_100)).toEqual({
      sampleRate: 48_000,
      samples: new Float32Array(),
    })
  })

  it('should preserve the pre-refactor sample bytes across legacy rates and lengths', () => {
    const digest = createHash('sha256')

    for (const sampleRate of [11025, 22050, 32000, 44100, 88200, 96000, 192000, 384000]) {
      for (const length of [0, 1, 2, 3, 7, 31, 257]) {
        const samples = Float32Array.from(
          {length},
          (_, index) => (((index * 37) % 257) - 128) / 128,
        )
        const original = samples.slice()
        const result = getOpusEncodingInput(samples, sampleRate)

        expect(result.samples).not.toBe(samples)
        expect(samples).toEqual(original)
        digest.update(
          JSON.stringify([sampleRate, length, result.sampleRate, result.samples.length]),
        )
        digest.update(new Uint8Array(result.samples.buffer))
      }
    }

    // Captured from origin/dev 02fad3325 before extracting the interpolation loop.
    expect(digest.digest('hex')).toBe(
      'ad0ba70008e3115a3d9a867e9ace46400ea6d6632424bc8b569c0764e7d211be',
    )
  })
})
