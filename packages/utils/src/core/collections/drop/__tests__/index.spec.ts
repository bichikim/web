import {drop, dropFn} from '../'
import {describe, expect, it} from 'vitest'

describe('dropFn', () => {
  it('should drop array items', () => {
    const target = [1, 2, 3, 4, 5]
    const result = dropFn(2)(target)

    expect(result).toEqual([3, 4, 5])
    expect(target).toEqual([1, 2, 3, 4, 5])
  })
})

describe('drop', () => {
  it('should drop array items', () => {
    const target = [1, 2, 3, 4, 5]
    const result = drop(target, 2)

    expect(result).toEqual([3, 4, 5])
    expect(target).toEqual([1, 2, 3, 4, 5])
  })
})
