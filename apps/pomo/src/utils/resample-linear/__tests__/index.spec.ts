/** @vitest-environment node */
import {describe, expect, it} from 'vitest'

import {resampleLinear} from '..'

describe('resampleLinear', () => {
  it('should interpolate a fractional source step and hold the last sample', () => {
    const samples = Float32Array.of(-2, 2, 0)
    const result = resampleLinear({outputLength: 7, samples, sourceStep: 0.5})

    expect(result).toEqual(Float32Array.of(-2, 0, 2, 1, 0, 0, 0))
    expect(samples).toEqual(Float32Array.of(-2, 2, 0))
  })

  it('should downsample without stretching the final sample to the output endpoint', () => {
    expect(
      resampleLinear({
        outputLength: 3,
        samples: Float32Array.of(0, 1, 0, -1, 0, 1),
        sourceStep: 1.5,
      }),
    ).toEqual(Float32Array.of(0, 0.5, -1))
  })

  it('should return owned storage at an unchanged spacing', () => {
    const samples = Float32Array.of(1, -0.5, 0.25)
    const result = resampleLinear({outputLength: samples.length, samples, sourceStep: 1})

    expect(result).toEqual(samples)
    result[0] = 0
    expect(samples[0]).toBe(1)
  })

  it('should repeat a single sample at fractional and past-end positions', () => {
    expect(
      resampleLinear({outputLength: 4, samples: Float32Array.of(0.25), sourceStep: 0.75}),
    ).toEqual(Float32Array.of(0.25, 0.25, 0.25, 0.25))
  })

  it('should hold the final sample even when the source position overflows', () => {
    expect(
      resampleLinear({
        outputLength: 3,
        samples: Float32Array.of(1, 2),
        sourceStep: Number.MAX_VALUE,
      }),
    ).toEqual(Float32Array.of(1, 2, 2))
  })

  it('should produce the requested zero-filled output for an empty source', () => {
    expect(resampleLinear({outputLength: 3, samples: new Float32Array(), sourceStep: 2})).toEqual(
      new Float32Array(3),
    )
  })

  it('should produce no values when the requested output length is zero', () => {
    expect(resampleLinear({outputLength: 0, samples: Float32Array.of(1), sourceStep: 0.5})).toEqual(
      new Float32Array(),
    )
  })

  it.each([-1, Number.POSITIVE_INFINITY])(
    'should retain the native allocation error for an invalid output length %s',
    (outputLength) => {
      expect(() =>
        resampleLinear({outputLength, samples: Float32Array.of(1), sourceStep: 1}),
      ).toThrow(RangeError)
    },
  )
})
