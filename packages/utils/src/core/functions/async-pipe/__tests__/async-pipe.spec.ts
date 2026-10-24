import {asyncPipe} from '../'
import {describe, expect, expectTypeOf, it, vi} from 'vitest'

describe('async-pipe', () => {
  it('should call all async functions', () => {
    const result = asyncPipe(
      (name: string) => Promise.resolve(`${name}-foo`),
      (name: string) => Promise.resolve(`${name}-bar`),
    )

    return expect(result('john')).resolves.toBe('john-foo-bar')
  })

  it('should infer the input and output through seven functions', () => {
    const result = asyncPipe(
      (value: string) => value.length,
      (value) => value > 0,
      (value) => (value ? new Date() : null),
      (value) => value?.getTime() ?? 0,
      (value) => Promise.resolve(String(value)),
      (value) => value.split(''),
      (value) => value.length,
    )

    expectTypeOf(result).parameters.toEqualTypeOf<[string]>()
    expectTypeOf(result).returns.toEqualTypeOf<Promise<number>>()
  })

  it('should infer the last return type after seven functions', () => {
    const increment = (value: number) => value + 1
    const result = asyncPipe(
      increment,
      increment,
      increment,
      increment,
      increment,
      increment,
      increment,
      (value: number) => String(value),
    )

    expectTypeOf(result).parameters.toEqualTypeOf<[number]>()
    expectTypeOf(result).returns.toEqualTypeOf<Promise<string>>()

    return expect(result(0)).resolves.toBe('7')
  })

  it('should preserve a function input', () => {
    const callback = vi.fn(() => 'value')
    const result = asyncPipe((value: typeof callback) => value)(callback)

    return expect(result).resolves.toBe(callback)
  })

  it('should evaluate a lazy input when requested', () => {
    const getValue = vi.fn(() => 'john')
    const result = asyncPipe((value: string) => `${value}-foo`)

    expect(getValue).not.toHaveBeenCalled()

    const promise = result.lazy(getValue)

    expect(getValue).toHaveBeenCalledOnce()

    return expect(promise).resolves.toBe('john-foo')
  })
})
