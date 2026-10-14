import {describe, expect, it, vi} from 'vitest'
import {memo} from '../4444'

describe('memo falsy return cache', () => {
  it('should return cached zero without re-invoking the wrapped function', () => {
    const compute = vi.fn(() => 0)
    const memoized = memo(compute)

    expect(memoized(1)).toBe(0)
    expect(memoized(1)).toBe(0)
    expect(compute).toHaveBeenCalledTimes(1)
  })

  it('should return cached false without re-invoking the wrapped function', () => {
    const compute = vi.fn(() => false)
    const memoized = memo(compute)

    expect(memoized('key')).toBe(false)
    expect(memoized('key')).toBe(false)
    expect(compute).toHaveBeenCalledTimes(1)
  })
})
