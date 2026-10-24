import {reduce} from '../'
import {describe, expect, it} from 'vitest'

describe('reduce', () => {
  it('should return the value with list and iteratee', () => {
    expect(reduce([1, 2, 3], (prev, value) => prev + value, 0)).toBe(6)
  })

  it('should return the value with list and iteratee (curry)', () => {
    expect(reduce([1, 2, 3])((prev, value) => prev + value, 0)).toBe(6)
  })

  it('should use the first item when the initial value is omitted', () => {
    expect(reduce([1, 2, 3], (prev, value) => prev + value)).toBe(6)
    expect(reduce([1, 2, 3])((prev, value) => prev + value)).toBe(6)
  })

  it('should throw for an empty list when the initial value is omitted', () => {
    expect(() => reduce([] as number[], (prev, value) => prev + value)).toThrow(TypeError)
    expect(() => reduce([] as number[])((prev, value) => prev + value)).toThrow(TypeError)
  })
})
