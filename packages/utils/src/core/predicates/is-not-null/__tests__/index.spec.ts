import {isNotNull} from '../'
import {describe, expect, it} from 'vitest'

describe('is-not-null', () => {
  it('should return true if value is not null', () => {
    expect(isNotNull(undefined)).toBe(true)
    expect(isNotNull('string')).toBe(true)
    expect(isNotNull(123)).toBe(true)
    expect(isNotNull(0)).toBe(true)
    expect(isNotNull(false)).toBe(true)
    expect(isNotNull(true)).toBe(true)
    expect(isNotNull(() => null)).toBe(true)
    expect(isNotNull(Number('foo'))).toBe(true)
    expect(isNotNull(Symbol('foo'))).toBe(true)
    expect(isNotNull(['foo'])).toBe(true)
    expect(isNotNull({foo: 'foo'})).toBe(true)
    expect(isNotNull('')).toBe(true)
    expect(isNotNull([])).toBe(true)
    expect(isNotNull({})).toBe(true)
  })

  it('should return false if value is null', () => {
    expect(isNotNull(null)).toBe(false)
  })
})
