import {describe, expect, test} from 'vitest'
import {getVertexBounds} from '../part-mask'

describe('getVertexBounds', () => {
  test('should bound the interleaved coordinates of every vertex array', () => {
    expect(getVertexBounds([new Float32Array([4, -2, 10, 6]), [-3.5, 8]])).toEqual({
      bottom: 8,
      left: -3.5,
      right: 10,
      top: -2,
    })
  })
  test('should leave the origin of an axis without coordinates undefined', () => {
    expect(getVertexBounds([])).toEqual({
      bottom: Number.NEGATIVE_INFINITY,
      left: undefined,
      right: Number.NEGATIVE_INFINITY,
      top: undefined,
    })
  })
  test('should bound more coordinates than a spread call accepts', () => {
    const vertices = new Float32Array(400_000).map((_, index) => index)
    expect(() => Math.min(...vertices)).toThrow(RangeError)
    expect(getVertexBounds([vertices])).toEqual({
      bottom: 399_999,
      left: 0,
      right: 399_998,
      top: 1,
    })
  })
})
