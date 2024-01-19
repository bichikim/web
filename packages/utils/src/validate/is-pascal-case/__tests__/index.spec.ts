import {isPascalCase} from '../'
import {describe, expect, it, vi} from 'vitest'
describe('isPascalCase', () => {
  it('should return true with pascal case string', () => {
    expect(isPascalCase('FooBar')).toBe(true)
    expect(isPascalCase('Foo1Bar')).toBe(true)
    expect(isPascalCase('Foo1ar')).toBe(true)
    expect(isPascalCase('FooB1ar')).toBe(true)
    expect(isPascalCase('Foobar')).toBe(true)
  })
  it('should return false with pascal case string', () => {
    expect(isPascalCase('booBar')).toBe(false)
    expect(isPascalCase('Foo-bar')).toBe(false)
    expect(isPascalCase('Foo-1ar')).toBe(false)
    expect(isPascalCase('Foo_1ar')).toBe(false)
    expect(isPascalCase('Foo&1ar')).toBe(false)
    expect(isPascalCase('1fooBar')).toBe(false)
  })
})
