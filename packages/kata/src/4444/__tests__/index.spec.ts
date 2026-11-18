import {memo} from '../'
import {describe, expect, it, vi} from 'vitest'

describe('memo', () => {
  it.each([0, -0, 0n, false, '', NaN, null, undefined])(
    'should reuse the cached %s result for each argument',
    (result) => {
      const compute = vi.fn((_key: string) => result)
      const memoized = memo(compute)

      expect(memoized('first')).toBe(result)
      expect(memoized('first')).toBe(result)
      expect(compute).toHaveBeenCalledTimes(1)

      expect(memoized('second')).toBe(result)
      expect(memoized('first')).toBe(result)
      expect(memoized('second')).toBe(result)
      expect(compute).toHaveBeenCalledTimes(2)
    },
  )

  it.each([
    {first: undefined, label: 'undefined and null', second: null},
    {first: 0, label: 'zero and negative zero', second: -0},
    {first: NaN, label: 'NaN and null', second: null},
    {first: Infinity, label: 'positive and negative infinity', second: -Infinity},
  ])('should cache distinct results for $label', ({first, second}) => {
    const compute = vi.fn((value: unknown) => Object.is(value, second))
    const memoized = memo(compute)

    expect(memoized(first)).toBe(false)
    expect(memoized(second)).toBe(true)
    expect(memoized(first)).toBe(false)
    expect(memoized(second)).toBe(true)
    expect(compute).toHaveBeenCalledTimes(2)
  })

  it('should keep distinct nested values and reuse structurally equal inputs', () => {
    const compute = vi.fn(
      (input: {values: ReadonlyArray<null | undefined>}) => input.values[0] === null,
    )
    const memoized = memo(compute)

    expect(memoized({values: [undefined]})).toBe(false)
    expect(memoized({values: [null]})).toBe(true)
    expect(memoized({values: [undefined]})).toBe(false)
    expect(memoized({values: [null]})).toBe(true)
    expect(compute).toHaveBeenCalledTimes(2)
  })

  it('should retry a thrown call and cache its successful result', () => {
    const error = new Error('not ready')
    const compute = vi
      .fn(() => 0)
      .mockImplementationOnce(() => {
        throw error
      })
    const memoized = memo(compute)

    expect(() => memoized()).toThrow(error)
    expect(memoized()).toBe(0)
    expect(memoized()).toBe(0)
    expect(compute).toHaveBeenCalledTimes(2)
  })

  it('should memoize a function', () => {
    const add = vi.fn((valueA: number, valueB: number) => valueA + valueB)

    const memoizedAdd = memo(add)

    expect(memoizedAdd(1, 2)).toBe(3)
    expect(add).toHaveBeenCalledTimes(1)
    expect(memoizedAdd(1, 2)).toBe(3)
    expect(add).toHaveBeenCalledTimes(1)
    expect(memoizedAdd(3, 4)).toBe(7)
    expect(add).toHaveBeenCalledTimes(2)
    expect(memoizedAdd(3, 4)).toBe(7)
    expect(add).toHaveBeenCalledTimes(2)
  })
})
