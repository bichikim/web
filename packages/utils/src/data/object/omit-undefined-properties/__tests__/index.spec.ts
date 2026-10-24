import {omitUndefinedProperties} from '../'
import {describe, expect, it} from 'vitest'

describe('omitUndefinedProperties', () => {
  it('should return a cleaned object', () => {
    const result = omitUndefinedProperties({bar: undefined, foo: 'foo'})

    expect(result).toEqual({foo: 'foo'})
  })

  it('should preserve falsy values except undefined', () => {
    const result = omitUndefinedProperties({empty: '', falsy: false, missing: undefined, zero: 0})

    expect(result).toEqual({empty: '', falsy: false, zero: 0})
  })

  it('should preserve enumerable symbol keys', () => {
    const key = Symbol('key')

    expect(omitUndefinedProperties({[key]: 'value'})).toEqual({[key]: 'value'})
    expect(omitUndefinedProperties({[key]: undefined})).toEqual({})
  })
})
