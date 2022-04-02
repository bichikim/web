import {clone} from '../'

describe('clone', () => {
  it('should return clone with an array', () => {
    const target = ['foo', 'bar']
    const result = clone(target)
    expect(Object.is(result, target)).toBe(false)
    expect(result).toEqual(target)
  })
  it('should return clone with an object', () => {
    const target = {bar: 'bar', foo: 'foo'}
    const result = clone(target)
    expect(Object.is(result, target)).toBe(false)
    expect(result).toEqual(target)
  })
  it('should return clone with a number', () => {
    const target = 50
    const result = clone(target)
    expect(Object.is(result, target)).toBe(true)
    expect(result).toEqual(target)
  })
  it('should return clone with a string', () => {
    const target = 'foo'
    const result = clone(target)
    expect(Object.is(result, target)).toBe(true)
    expect(result).toEqual(target)
  })
})
