/** @vitest-environment node */
import {describe, expect, expectTypeOf, it} from 'vitest'
import {intersperse} from '..'

describe('intersperse', () => {
  it('should insert separators only between items without changing the input', () => {
    const items = Object.freeze([1, 2, 2])
    expect(intersperse(items, 0)).toEqual([1, 0, 2, 0, 2])
    expect(items).toEqual([1, 2, 2])
  })

  it('should return a new empty array for an empty input', () => {
    const items: readonly number[] = []
    const result = intersperse(items, 0)
    expect(result).toEqual([])
    expect(result).not.toBe(items)
  })

  it('should copy a single item without adding a separator', () => {
    const items = [1]
    const result = intersperse(items, 0)
    expect(result).toEqual([1])
    expect(result).not.toBe(items)
  })

  it('should preserve array items and separator references without flattening them', () => {
    const first = Float32Array.of(0.5)
    const second = new Float32Array()
    const gap = new Float32Array(2)
    const result = intersperse([first, second, first], gap)
    expect(result).toEqual([first, gap, second, gap, first])
    expect(result[0]).toBe(first)
    expect(result[1]).toBe(gap)
    expect(result[2]).toBe(second)
    expect(result[3]).toBe(gap)
  })

  it('should infer a union when the separator has a different type', () => {
    const result = intersperse([1, 2], ',' as const)
    expect(result).toEqual([1, ',', 2])
    expectTypeOf(result).toEqualTypeOf<Array<number | ','>>()
  })
})
