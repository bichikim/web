import {isArray} from '../'
import {describe, expect, it} from 'vitest'

describe('is-array', () => {
  it('should return true for arrays', () => {
    expect(isArray([])).toBe(true)
    expect(isArray([1, 2, 3])).toBe(true)
    expect(isArray(['foo', 'bar'])).toBe(true)
    expect(isArray([null, undefined])).toBe(true)
    expect(isArray([{foo: 'bar'}])).toBe(true)
    expect(isArray(new Array(3))).toBe(true)
  })

  it('should return false for non-arrays', () => {
    expect(isArray(null)).toBe(false)
    expect(isArray(undefined)).toBe(false)
    expect(isArray('string')).toBe(false)
    expect(isArray(123)).toBe(false)
    expect(isArray({})).toBe(false)
    expect(isArray({length: 3})).toBe(false)
    expect(isArray(() => null)).toBe(false)
    expect(isArray(Symbol('foo'))).toBe(false)
    expect(isArray(new Set([1, 2, 3]))).toBe(false)
    expect(isArray(new Map())).toBe(false)
  })
})
