import {describe, expect, it} from 'vitest'
import {isCamelCase} from '../'

describe('isCamelcase', () => {
  it('should return true withim camel case string', () => {
    expect(isCamelCase('fooBar')).toBe(true)
    expect(isCamelCase('foo1Bar')).toBe(true)
    expect(isCamelCase('foo1ar')).toBe(true)
    expect(isCamelCase('fooB1ar')).toBe(true)
    expect(isCamelCase('foobar')).toBe(true)
  })

  it('should return false without camelcase string', () => {
    expect(isCamelCase('FooBar')).toBe(false)
    expect(isCamelCase('foo-bar')).toBe(false)
    expect(isCamelCase('foo-1ar')).toBe(false)
    expect(isCamelCase('foo_1ar')).toBe(false)
    expect(isCamelCase('foo&1ar')).toBe(false)
    expect(isCamelCase('1fooBar')).toBe(false)
  })
})
