import {describe, expect, it} from 'vitest'

import {getOpusEncodingInput} from '../opus-sampling'

describe('getOpusEncodingInput', () => {
  it.each([Number.NaN, 0, -1])('should reject an invalid sample rate of %s', (sampleRate) => {
    expect(() => getOpusEncodingInput(new Float32Array(), sampleRate)).toThrow(
      `Invalid audio sample rate: ${sampleRate}`,
    )
  })

  it('should preserve PCM at an Opus-native sample rate', () => {
    const samples = new Float32Array([0, 0.5, 1])

    expect(getOpusEncodingInput(samples, 24_000)).toEqual({sampleRate: 24_000, samples})
  })

  it('should linearly resample legacy PCM to 48 kHz', () => {
    const result = getOpusEncodingInput(new Float32Array([0, 1]), 32_000)

    expect(result.sampleRate).toBe(48_000)
    expect(result.samples).toHaveLength(3)
    expect(result.samples[0]).toBe(0)
    expect(result.samples[1]).toBeCloseTo(2 / 3)
    expect(result.samples[2]).toBe(1)
  })

  it('should preserve an empty legacy PCM buffer', () => {
    expect(getOpusEncodingInput(new Float32Array(), 44_100)).toEqual({
      sampleRate: 48_000,
      samples: new Float32Array(),
    })
  })
})
