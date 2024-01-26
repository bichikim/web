import {isNull} from '../'
import {describe, expect, it, vi} from 'vitest'
describe('is-null', () => {
  it('should return true if value is undefined', () => {
    expect(isNull(null)).toBe(true)
    expect(isNull(undefined)).toBe(false)
    expect(isNull('undefined')).toBe(false)
    expect(isNull(123)).toBe(false)
    expect(isNull(() => null)).toBe(false)
    expect(isNull(Number('foo'))).toBe(false)
    expect(isNull(Symbol('foo'))).toBe(false)
    expect(isNull(['foo'])).toBe(false)
    expect(isNull({foo: 'foo'})).toBe(false)
  })
})
