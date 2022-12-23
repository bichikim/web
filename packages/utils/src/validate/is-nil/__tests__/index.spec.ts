import {isNil} from '../'

describe('is-nil', () => {
  it('should return true if value is undefined', () => {
    expect(isNil(null)).toBe(true)
    expect(isNil(undefined)).toBe(true)
    expect(isNil('undefined')).toBe(false)
    expect(isNil(123)).toBe(false)
    expect(isNil(() => null)).toBe(false)
    expect(isNil(Number('foo'))).toBe(false)
    expect(isNil(Symbol('foo'))).toBe(false)
    expect(isNil(['foo'])).toBe(false)
    expect(isNil({foo: 'foo'})).toBe(false)
  })
})
