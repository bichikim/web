import {isNotUndefined} from '../'
import {describe, expect, it} from 'vitest'

describe('is-not-undefined', () => {
  it('should return true if value is not undefined', () => {
    expect(isNotUndefined(null)).toBe(true)
    expect(isNotUndefined('string')).toBe(true)
    expect(isNotUndefined(123)).toBe(true)
    expect(isNotUndefined(0)).toBe(true)
    expect(isNotUndefined(false)).toBe(true)
    expect(isNotUndefined(true)).toBe(true)
    expect(isNotUndefined(() => null)).toBe(true)
    expect(isNotUndefined(Number('foo'))).toBe(true)
    expect(isNotUndefined(Symbol('foo'))).toBe(true)
    expect(isNotUndefined(['foo'])).toBe(true)
    expect(isNotUndefined({foo: 'foo'})).toBe(true)
    expect(isNotUndefined('')).toBe(true)
    expect(isNotUndefined([])).toBe(true)
    expect(isNotUndefined({})).toBe(true)
  })

  it('should return false if value is undefined', () => {
    expect(isNotUndefined(undefined)).toBe(false)
  })
})
