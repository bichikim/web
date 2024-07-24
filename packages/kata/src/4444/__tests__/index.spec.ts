import {memo} from '../'
import {expect, describe, it, vi} from 'vitest'


describe('memo', () => {
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

  it('should clear memoized function cache', () => {
    const add = vi.fn((valueA: number, valueB: number) => valueA + valueB)

    const memoizedAdd = memo(add)

    expect(memoizedAdd(1, 2)).toBe(3)

    expect(add).toHaveBeenCalledTimes(1)

    expect(memoizedAdd(1, 2)).toBe(3)

    expect(add).toHaveBeenCalledTimes(1)

    memoizedAdd.clearCache()

    expect(memoizedAdd(1, 2)).toBe(3)

    expect(add).toHaveBeenCalledTimes(2)
  })
})