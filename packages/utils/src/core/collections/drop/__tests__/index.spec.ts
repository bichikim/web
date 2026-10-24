import {drop} from '../'
import {describe, expect, it} from 'vitest'

describe('drop', () => {
  it('should drop array items', () => {
    const target = [1, 2, 3, 4, 5]
    const result = drop(target, 2)

    expect(result).toEqual([3, 4, 5])
    expect(target).toEqual([1, 2, 3, 4, 5])
  })
})
