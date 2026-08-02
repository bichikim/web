import {reduce, reduceOp} from '../'
import {describe, expect, it} from 'vitest'

describe('reduce', () => {
  it('should return the value with list and iteratee', () => {
    expect(reduce([1, 2, 3], (prev, value) => prev + value, 0)).toBe(6)
  })

  it('should return the value with list and iteratee (curry)', () => {
    expect(reduce([1, 2, 3])((prev, value) => prev + value, 0)).toBe(6)
  })
})

describe('reduceOp', () => {
  it('should return the value with list and iteratee', () => {
    expect(reduceOp((prev, value) => prev + value, 0, [1, 2, 3])).toBe(6)
  })

  it('should return the value with list and iteratee (curry)', () => {
    expect(reduceOp((prev, value: number) => prev + value, 0)([1, 2, 3])).toBe(6)
  })
})
