import {describe, expect, expectTypeOf, it, vi} from 'vitest'
import {invertParams} from '../'

describe('invertParams', () => {
  it('should create an inverse order function (1 params)', () => {
    const targetFunction = vi.fn((foo: string) => `${foo}`)
    const inverseOrderedFunction = invertParams(targetFunction)
    const result = inverseOrderedFunction('foo')

    expectTypeOf(inverseOrderedFunction).parameters.toEqualTypeOf<[string]>()
    expectTypeOf(inverseOrderedFunction).returns.toMatchTypeOf<string>()
    expect(targetFunction).toHaveBeenCalledTimes(1)
    expect(result).toBe('foo')
  })

  it('should create an inverse order function (2 params)', () => {
    const targetFunction = vi.fn((foo: string, age: number) => `${foo}, ${age}`)
    const inverseOrderedFunction = invertParams(targetFunction)
    const result = inverseOrderedFunction(10, 'foo')

    expectTypeOf(inverseOrderedFunction).parameters.toEqualTypeOf<[number, string]>()
    expectTypeOf(inverseOrderedFunction).returns.toMatchTypeOf<string>()
    expect(targetFunction).toHaveBeenCalledTimes(1)
    expect(result).toBe('foo, 10')
  })

  it('should support void parameters (2 params)', () => {
    const targetFunction = vi.fn((foo: string, age?: number) => `${foo}, ${age}`)
    const inverseOrderedFunction = invertParams(targetFunction)
    const result = inverseOrderedFunction(undefined, 'foo')

    expectTypeOf(inverseOrderedFunction).parameters.toEqualTypeOf<[number | undefined, string]>()
    expectTypeOf(inverseOrderedFunction).returns.toMatchTypeOf<string>()
    expect(targetFunction).toHaveBeenCalledTimes(1)
    expect(result).toBe('foo, undefined')
  })

  it('should support void parameters (3 params)', () => {
    const targetFunction = vi.fn(
      (foo: string, age?: number, info?: {name: string}) => `${foo}, ${age} ${info?.name}`,
    )
    const inverseOrderedFunction = invertParams(targetFunction)
    const result = inverseOrderedFunction(undefined, undefined, 'foo')

    expectTypeOf(inverseOrderedFunction).parameters.toEqualTypeOf<
      [{name: string} | undefined, number | undefined, string]
    >()
    expectTypeOf(inverseOrderedFunction).returns.toMatchTypeOf<string>()
    expect(targetFunction).toHaveBeenCalledTimes(1)
    expect(result).toBe('foo, undefined undefined')
  })
})
