import {defaultValue} from '../'
import {describe, expect, it} from 'vitest'

describe('defaultValue', () => {
  it('should return default value', () => {
    expect(defaultValue(undefined, () => 'foo')).toBe('foo')
    expect(defaultValue(undefined, 'foo')).toBe('foo')
    expect(defaultValue('bar', () => 'foo')).toBe('bar')
  })
})
