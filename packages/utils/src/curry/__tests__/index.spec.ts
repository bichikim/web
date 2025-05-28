/* eslint-disable max-params */
import {describe, expect, it} from 'vitest'
import {curry, curryReverse} from '../'

describe('curry', () => {
  it('should curry function', () => {
    const foo = (name: string, age: number) => `${name} ${age}`
    const curryFoo = curry(foo)

    expect(curryFoo('foo')(10)).toBe('foo 10')
    expect(curryFoo('foo', 10)).toBe('foo 10')
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
