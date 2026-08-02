import {isUndefined} from '../'
import {describe, expect, it} from 'vitest'

describe('is-undefined', () => {
  it('should return true if value is undefined', () => {
    expect(isUndefined(null)).toBe(false)
    expect(isUndefined(undefined)).toBe(true)
    expect(isUndefined('undefined')).toBe(false)
    expect(isUndefined(123)).toBe(false)
    expect(isUndefined(() => null)).toBe(false)
    expect(isUndefined(Number('foo'))).toBe(false)
    expect(isUndefined(Symbol('foo'))).toBe(false)
    expect(isUndefined(['foo'])).toBe(false)
    expect(isUndefined({foo: 'foo'})).toBe(false)
  })
})
