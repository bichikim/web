import {mayFunctionValue} from '../'
import {expectType} from 'tsd'

describe('may-function-value', () => {
  it('should return a value from function execution', () => {
    const result = mayFunctionValue(() => 'foo')
    expectType<string>(result)
    expect(result).toBe('foo')
  })
  it('should return the value from a value which is not a function', () => {
    const result = mayFunctionValue('bar')
    expectType<string>(result)
    expect(result).toBe('bar')
  })
  it('should return the value with args', () => {
    const result = mayFunctionValue((foo, bar) => `${foo}, ${bar}`, ['foo', 'bar'])
    expectType<string>(result)
    expect(result).toBe('foo, bar')
  })
})
