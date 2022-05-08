import {isObject} from '../'

describe('isObject', () => {
  it('should return true with a record', () => {
    const result = isObject({})
    expect(result).toBe(true)
  })
  it('should return true with a class', () => {
    class Foo {
      name: string = 'foo'
    }
    const result = isObject(new Foo())
    expect(result).toBe(true)
  })
  it('should return true with array', () => {
    const result = isObject([])
    expect(result).toBe(true)
  })
  it('should return false the null', () => {
    const result = isObject(null)
    expect(result).toBe(false)
  })
  it('should return false with a function', () => {
    const result = isObject(() => 'foo')
    expect(result).toBe(false)
  })
  it('should return false with a number', () => {
    const result = isObject(5)
    expect(result).toBe(false)
  })
  it('should return false with a string', () => {
    const result = isObject('foo')
    expect(result).toBe(false)
  })
})
