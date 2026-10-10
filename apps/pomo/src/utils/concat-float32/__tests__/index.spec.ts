/** @vitest-environment node */
import {describe, expect, expectTypeOf, it} from 'vitest'

import {concatFloat32} from '../index'

describe('concatFloat32', () => {
  it('should copy visible samples in order, retaining duplicate and empty views', () => {
    const backing = Float32Array.of(99, 0.5, -0.25, 1, 88)
    const first = backing.subarray(1, 3)
    const chunks = Object.freeze([first, new Float32Array(), backing.subarray(2, 4), first])

    expect(concatFloat32({chunks}, 1)).toEqual(
      Float32Array.of(0.5, -0.25, 0, 0, -0.25, 1, 0, 0.5, -0.25),
    )
    expect(backing).toEqual(Float32Array.of(99, 0.5, -0.25, 1, 88))
  })

  it('should omit leading and trailing gaps and allow zero-length gaps', () => {
    const chunks = [Float32Array.of(0.5), Float32Array.of(-0.5)]

    expect(concatFloat32({chunks}, 2)).toEqual(Float32Array.of(0.5, 0, 0, -0.5))
    expect(concatFloat32({chunks}, 0)).toEqual(Float32Array.of(0.5, -0.5))
  })

  it('should retain gaps between empty views in a nonempty collection', () => {
    expect(concatFloat32({chunks: [new Float32Array(), new Float32Array()]}, 3)).toEqual(
      Float32Array.of(0, 0, 0),
    )
  })

  it('should propagate the native negative allocation error for an empty collection with a gap', () => {
    expect(() => concatFloat32({chunks: []}, 3)).toThrow(RangeError)
  })

  it('should copy a single view into an independent ordinary buffer', () => {
    const input = Float32Array.of(1, 2)
    const result = concatFloat32({chunks: [input]}, 3)

    expect(result).toEqual(input)
    expect(result.buffer).not.toBe(input.buffer)
    input[0] = 9
    result[1] = 8
    expect(input).toEqual(Float32Array.of(9, 2))
    expect(result).toEqual(Float32Array.of(1, 8))
    expectTypeOf(result).toEqualTypeOf<Float32Array<ArrayBuffer>>()
  })

  it('should copy shared-buffer views without retaining their storage', () => {
    const input = new Float32Array(new SharedArrayBuffer(16))
    input.set([99, 0.5, -0.5, 88])
    const result = concatFloat32({chunks: [input.subarray(1, 3)]}, 1)

    expect(result).toEqual(Float32Array.of(0.5, -0.5))
    expect(result.buffer).toBeInstanceOf(ArrayBuffer)
    input[1] = 9
    expect(result).toEqual(Float32Array.of(0.5, -0.5))
  })

  it('should preserve non-finite samples and signed zero', () => {
    const result = concatFloat32(
      {chunks: [Float32Array.of(Number.NaN, Number.POSITIVE_INFINITY, -0)]},
      0,
    )

    expect(result).toEqual(Float32Array.of(Number.NaN, Number.POSITIVE_INFINITY, -0))
    expect(Object.is(result[2], -0)).toBe(true)
  })

  it('should propagate the native error for a detached source buffer', () => {
    const input = Float32Array.of(1)
    structuredClone(input.buffer, {transfer: [input.buffer]})

    expect(() => concatFloat32({chunks: [input]}, 0)).toThrow(
      expect.objectContaining({name: 'TypeError'}),
    )
  })
})
