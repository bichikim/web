import {describe, expect, it, vi} from 'vitest'

import {compose} from '../compose'

describe('compose', () => {
  it('should apply transforms from right to left', () => {
    const addOne = vi.fn((value: number) => value + 1)
    const double = vi.fn((value: number) => value * 2)

    expect(compose(addOne, double)(3)).toBe(7)
    expect(double).toHaveBeenCalledWith(3)
    expect(addOne).toHaveBeenCalledWith(6)
  })

  it('should return the original value when no transforms are provided', () => {
    const value = {label: 'unchanged'}

    expect(compose<typeof value>()(value)).toBe(value)
  })
})
