import {reverse} from '../'
import {describe, expect, it} from 'vitest'

describe('reverse', () => {
  it('should reverse an array', () => {
    const target = [1, 2, 3, 4, 5]
    const result = reverse(target)

    expect(result).toEqual([5, 4, 3, 2, 1])
    expect(target).toEqual([1, 2, 3, 4, 5])
  })
})
