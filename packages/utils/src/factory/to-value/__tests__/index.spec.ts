import {MaybeFunction} from 'src/types'
import {expectType} from 'tsd'
import {toValue} from '../'
import {describe, it, expect} from 'vitest'
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
    const value = (foo: string, bar: string) => `${foo}, ${bar}`
    const result = toValue(value, ['foo', 'bar'])
    expectType<string>(result)
    expect(result).toBe('foo, bar')
  })
  it('should return the value with args (maybe function)', () => {
    const value: MaybeFunction<string> = (foo: string, bar: string) => `${foo}, ${bar}`

    const result = toValue<string, [string, string]>(value, ['foo', 'bar'])
    expectType<string>(result)
    expect(result).toBe('foo, bar')
  })
})
