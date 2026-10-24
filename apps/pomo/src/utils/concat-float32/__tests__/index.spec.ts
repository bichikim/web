/** @vitest-environment node */
import {describe, expect, expectTypeOf, it} from 'vitest'
import {concatFloat32} from '../index'

describe('concatFloat32', () => {
  it('should copy visible samples in order, retaining duplicate and empty arrays', () => {
    const backing = Float32Array.of(99, 0.5, -0.25, 1, 88)
    const first = backing.subarray(1, 3)
    const chunks = Object.freeze([first, new Float32Array(), backing.subarray(2, 4), first])
    expect(concatFloat32(chunks)).toEqual(Float32Array.of(0.5, -0.25, -0.25, 1, 0.5, -0.25))
    expect(backing).toEqual(Float32Array.of(99, 0.5, -0.25, 1, 88))
  })

  it('should return an empty array for an empty list or only empty chunks', () => {
    expect(concatFloat32([])).toEqual(new Float32Array())
    expect(concatFloat32([new Float32Array(), new Float32Array()])).toEqual(new Float32Array())
  })

  it('should copy a single array into an independent ordinary buffer', () => {
    const input = Float32Array.of(1, 2)
    const result = concatFloat32([input])
    expect(result).toEqual(input)
    expect(result.buffer).not.toBe(input.buffer)
    input[0] = 9
    result[1] = 8
    expect(input).toEqual(Float32Array.of(9, 2))
    expect(result).toEqual(Float32Array.of(1, 8))
    expectTypeOf(result).toEqualTypeOf<Float32Array<ArrayBuffer>>()
  })

  it('should copy shared-buffer arrays without retaining their storage', () => {
    const input = new Float32Array(new SharedArrayBuffer(16))
    input.set([99, 0.5, -0.5, 88])
    const result = concatFloat32([input.subarray(1, 3)])
    expect(result).toEqual(Float32Array.of(0.5, -0.5))
    expect(result.buffer).toBeInstanceOf(ArrayBuffer)
    input[1] = 9
    expect(result).toEqual(Float32Array.of(0.5, -0.5))
  })

  it('should preserve non-finite samples and signed zero', () => {
    const result = concatFloat32([Float32Array.of(Number.NaN, Number.POSITIVE_INFINITY, -0)])
    expect(result).toEqual(Float32Array.of(Number.NaN, Number.POSITIVE_INFINITY, -0))
    expect(Object.is(result[2], -0)).toBe(true)
  })

  it('should propagate the native error for a detached source buffer', () => {
    const input = Float32Array.of(1)
    structuredClone(input.buffer, {transfer: [input.buffer]})
    expect(() => concatFloat32([input])).toThrow(expect.objectContaining({name: 'TypeError'}))
  })
})
