import {toValue} from '../'
import {expectType} from 'tsd'

describe('to-value', () => {
  it('should return a value from function execution', () => {
    const result = toValue(() => 'foo')
    expectType<string>(result)
    expect(result).toBe('foo')
  })
  it('should return the value from a value which is not a function', () => {
    const result = toValue('bar')
    expectType<string>(result)
    expect(result).toBe('bar')
  })
  it('should return the value with args', () => {
    const result = toValue((foo, bar) => `${foo}, ${bar}`, ['foo', 'bar'])
    expectType<string>(result)
    expect(result).toBe('foo, bar')
  })
})
