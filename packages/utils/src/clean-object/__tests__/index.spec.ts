import {cleanObject} from '../'
import {describe, expect, it} from 'vitest'

describe('cleanObject', () => {
  it('should return a cleaned object', () => {
    const result = cleanObject({bar: undefined, foo: 'foo'})

    expect(result).toEqual({foo: 'foo'})
  })

  it('should preserve falsy values except undefined', () => {
    const result = cleanObject({empty: '', falsy: false, missing: undefined, zero: 0})

    expect(result).toEqual({empty: '', falsy: false, zero: 0})
  })
})
