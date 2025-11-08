import {describe, expect, expectTypeOf, it} from 'vitest'
import {curry, curryReverse} from '../'

describe('curry', () => {
  it('should curry function', () => {
    const foo = (name: string, age: number) => `${name} ${age}`
    const curryFoo = curry(foo)

    expect(curryFoo('foo')(10)).toBe('foo 10')
    expect(curryFoo('foo', 10)).toBe('foo 10')
  })
})

describe('type check', () => {
  it('should be expected type of none parameters', () => {
    const foo = () => 'foo'
    const curryFoo = curry(foo)

    expectTypeOf(curryFoo).parameters.toEqualTypeOf<[]>()
    expectTypeOf(curryFoo).returns.toEqualTypeOf<string>()
  })

  it('should be expected type of a parameter', () => {
    const foo = (a: string) => `${a}`
    const curryFoo = curry(foo)

    expectTypeOf(curryFoo).parameters.toEqualTypeOf<[string]>()
    expectTypeOf(curryFoo).returns.toEqualTypeOf<string>()
  })

  it('should be expected type of a? parameter', () => {
    const foo = (a?: string) => `${a}`
    const curryFoo = curry(foo)

    expectTypeOf(curryFoo).parameters.toEqualTypeOf<[string?]>()
    expectTypeOf(curryFoo).returns.toEqualTypeOf<string>()
  })

  it('should be expected type of a, b parameters', () => {
    const foo = (a: string, b: number) => `${a} ${b}`
    const curryFoo = curry(foo)

    expectTypeOf(curryFoo).parameters.toEqualTypeOf<[string] | [string, number]>()
    const partial1 = curryFoo('foo')

    expectTypeOf(partial1).parameters.toEqualTypeOf<[number]>()
    expectTypeOf(partial1).returns.toEqualTypeOf<string>()

    const partial2 = curryFoo('foo', 10)

    expectTypeOf(partial2).toEqualTypeOf<string>()
  })

  it('should be expected type of a, b? parameters', () => {
    const foo = (a: string, b?: number) => `${a} ${b}`
    const curryFoo = curry(foo)

    expectTypeOf(curryFoo).parameters.toEqualTypeOf<[string] | [string, number?]>()
    const partial1 = curryFoo('foo')

    expectTypeOf(partial1).parameters.toEqualTypeOf<[number?]>()
    expectTypeOf(partial1).returns.toEqualTypeOf<string>()

    const partial2 = curryFoo('foo', 10)

    expectTypeOf(partial2).toEqualTypeOf<string>()
  })

  it('should be expected type of a?, b? parameters', () => {
    const foo = (a?: string, b?: number) => `${a} ${b}`
    const curryFoo = curry(foo)

    expectTypeOf(curryFoo).parameters.toEqualTypeOf<[string?] | [string?, number?]>()

    const partial1 = curryFoo()

    expectTypeOf(partial1).returns.toEqualTypeOf<string>()

    const partial2 = curryFoo('foo')

    expectTypeOf(partial2).parameters.toEqualTypeOf<[number?]>()
    expectTypeOf(partial2).returns.toEqualTypeOf<string>()

    const partial3 = curryFoo('foo', 10)

    expectTypeOf(partial3).toEqualTypeOf<string>()
  })

  it('should be expected type of a, b, c parameters', () => {
    const foo = (a: string, b: number, c: boolean) => `${a} ${b} ${c}`
    const curryFoo = curry(foo)

    expectTypeOf(curryFoo).parameters.toEqualTypeOf<[string] | [string, number] | [string, number, boolean]>()
    const partial1 = curryFoo('foo')

    expectTypeOf(partial1).parameters.toEqualTypeOf<[number] | [number, boolean]>()

    const partial2 = partial1(0)

    expectTypeOf(partial2).parameters.toEqualTypeOf<[boolean]>()
    expectTypeOf(partial2).returns.toEqualTypeOf<string>()

    const partial3 = partial1(0, true)

    expectTypeOf(partial3).toEqualTypeOf<string>()
  })

  it('should be expected type of a, b, c? parameters', () => {
    const foo = (a: string, b: number, c?: boolean) => `${a} ${b} ${c}`
    const curryFoo = curry(foo)

    expectTypeOf(curryFoo).parameters.toEqualTypeOf<[string] | [string, number] | [string, number, boolean?]>()
    const partial1 = curryFoo('foo')

    expectTypeOf(partial1).parameters.toEqualTypeOf<[number] | [number, boolean?]>()

    const partial2 = partial1(0)

    expectTypeOf(partial2).parameters.toEqualTypeOf<[boolean?]>()
    expectTypeOf(partial2).returns.toEqualTypeOf<string>()

    const partial3 = partial1(0, true)

    expectTypeOf(partial3).toEqualTypeOf<string>()
  })
})

describe('curryReverse', () => {
  it('should curry function 2', () => {
    const foo = (name: string, age: number) => `${name} ${age}`
    const curryFoo = curryReverse(foo)

    expect(curryFoo(10)('foo')).toBe('foo 10')
    expect(curryFoo(10, 'foo')).toBe('foo 10')
  })

  it('should curry function 3', () => {
    const foo = (name: string, age: number, gender: string) => `${name} ${age} ${gender}`
    const curryFoo = curryReverse(foo)

    expect(curryFoo('male')(10)('foo')).toBe('foo 10 male')
    expect(curryFoo('male', 10)('foo')).toBe('foo 10 male')
    expect(curryFoo('male', 10, 'foo')).toBe('foo 10 male')
  })

  it('should curry function 4', () => {
    const foo = (name: string, age: number, gender: string, hobby: string) => `${name} ${age} ${gender} ${hobby}`
    const curryFoo = curryReverse(foo)

    expect(curryFoo('drink')('male')(10)('bar')).toBe('bar 10 male drink')
    expect(curryFoo('drink', 'male')(10)('bar')).toBe('bar 10 male drink')
    expect(curryFoo('drink', 'male', 10)('bar')).toBe('bar 10 male drink')
    expect(curryFoo('drink', 'male', 10, 'bar')).toBe('bar 10 male drink')
  })

  it('should curry function 5', () => {
    const foo = (name: string, age: number, gender: string, hobby: string, job: string) =>
      `${name} ${age} ${gender} ${hobby} ${job}`
    const curryFoo = curryReverse(foo)

    expect(curryFoo('developer')('drink')('male')(10)('bar')).toBe('bar 10 male drink developer')
    expect(curryFoo('developer', 'drink')('male')(10)('bar')).toBe('bar 10 male drink developer')
    expect(curryFoo('developer', 'drink', 'male')(10)('bar')).toBe('bar 10 male drink developer')
    expect(curryFoo('developer', 'drink', 'male', 10)('bar')).toBe('bar 10 male drink developer')
    expect(curryFoo('developer', 'drink', 'male', 10, 'bar')).toBe('bar 10 male drink developer')
  })

  it('should curry function 6', () => {
    const foo = (name: string, age: number, gender: string, hobby: string, job: string, dream: string) =>
      `${name} ${age} ${gender} ${hobby} ${job} ${dream}`
    const curryFoo = curryReverse(foo)

    expect(curryFoo('rich')('developer')('drink')('male')(10)('bar')).toBe('bar 10 male drink developer rich')
    expect(curryFoo('rich', 'developer')('drink')('male')(10)('bar')).toBe('bar 10 male drink developer rich')
    expect(curryFoo('rich', 'developer', 'drink')('male')(10)('bar')).toBe('bar 10 male drink developer rich')
    expect(curryFoo('rich', 'developer', 'drink', 'male')(10)('bar')).toBe('bar 10 male drink developer rich')
    expect(curryFoo('rich', 'developer', 'drink', 'male', 10)('bar')).toBe('bar 10 male drink developer rich')
    expect(curryFoo('rich', 'developer', 'drink', 'male', 10, 'bar')).toBe('bar 10 male drink developer rich')
  })
})
