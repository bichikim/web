import {describe, expect, it} from 'vitest'
import {curry} from '../'

describe('curry', () => {
  it('should curry function', () => {
    const foo = (name: string, age: number) => `${name} ${age}`
    const curryFoo = curry(foo)

    expect(curryFoo('foo')(10)).toBe('foo 10')
    expect(curryFoo('foo', 10)).toBe('foo 10')
  })
})
