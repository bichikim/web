/** @vitest-environment node */
import {describe, expect, expectTypeOf, it} from 'vitest'
import {mixToMono} from '..'

describe('mixToMono', () => {
  it('should average each interleaved stereo frame without changing the input', () => {
    const samples = Float32Array.of(-1, 1, 0.5, 0.25)
    expect(mixToMono({channels: 2, samples})).toEqual(Float32Array.of(0, 0.375))
    expect(samples).toEqual(Float32Array.of(-1, 1, 0.5, 0.25))
  })

  it('should average all channels in a multichannel frame', () => {
    expect(mixToMono({channels: 3, samples: Float32Array.of(1, -1, 0.75, 0.5, 0.25, 0)})).toEqual(
      Float32Array.of(0.25, 0.25),
    )
  })

  it('should copy mono samples into a new buffer', () => {
    const samples = Float32Array.of(-1, 0.5)
    const result = mixToMono({channels: 1, samples})
    expect(result).toEqual(samples)
    expect(result.buffer).not.toBe(samples.buffer)
    result[0] = 0
    expect(samples[0]).toBe(-1)
    expectTypeOf(result).toEqualTypeOf<Float32Array<ArrayBuffer>>()
  })

  it('should return an empty array when there are no frames', () => {
    expect(mixToMono({channels: 2, samples: new Float32Array()})).toEqual(new Float32Array())
  })

  it.each([0, -1, 0.5, NaN, Infinity])('should reject an invalid channel count: %s', (channels) => {
    expect(() => mixToMono({channels, samples: new Float32Array()})).toThrow(RangeError)
  })

  it('should reject an incomplete channel frame', () => {
    expect(() => mixToMono({channels: 2, samples: Float32Array.of(1, 2, 3)})).toThrow(RangeError)
  })
})
