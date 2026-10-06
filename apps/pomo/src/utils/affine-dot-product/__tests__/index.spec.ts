import {describe, expect, it} from 'vitest'

import {affineDotProduct} from '../index'

describe('affineDotProduct', () => {
  it('should evaluate a weight interval without changing frozen inputs', () => {
    const values = Object.freeze([2, 3])
    const weights = Object.freeze([99, 4, 5, 99])

    expect(affineDotProduct(values, weights, 7, 1)).toBe(30)
    expect(values).toEqual([2, 3])
    expect(weights).toEqual([99, 4, 5, 99])
  })

  it('should accumulate products into the bias before subsequent additions', () => {
    expect(affineDotProduct([1, 1], [1e16, -1e16], 1)).toBe(0)
  })

  it('should preserve the bias for empty values without reading weights', () => {
    expect(affineDotProduct([], [], -0)).toBe(-0)
    expect(affineDotProduct([], [], Number.POSITIVE_INFINITY, 12)).toBe(Number.POSITIVE_INFINITY)
  })

  it('should propagate missing values and out-of-range weights as NaN', () => {
    expect(affineDotProduct(new Array<number>(2), [4, 5], 7)).toBeNaN()
    expect(affineDotProduct([2, 3], [4], 7)).toBeNaN()
    expect(affineDotProduct([2], [4], 7, -1)).toBeNaN()
  })

  it('should preserve non-finite arithmetic without introducing validation errors', () => {
    expect(affineDotProduct([Number.NaN], [1], 0)).toBeNaN()
    expect(affineDotProduct([1], [Number.POSITIVE_INFINITY], 0)).toBe(Number.POSITIVE_INFINITY)
    expect(affineDotProduct([0], [Number.POSITIVE_INFINITY], 0)).toBeNaN()
  })
})
