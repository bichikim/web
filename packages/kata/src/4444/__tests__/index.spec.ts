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
