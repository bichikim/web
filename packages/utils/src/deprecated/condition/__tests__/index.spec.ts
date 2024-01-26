import {condition} from '../'
import {describe, expect, it} from 'vitest'
describe('condition', () => {
  it('should run a next code by condition', () => {
    const run = condition(
      [
        //
        (item: string) => item === 'foo',
        (item) => `${item} is foo`,
      ],
      [
        //
        (item) => item === 'bar',
        (item) => `${item} is bar`,
      ],
      () => 'i do not know',
    )
    expect(run('foo')).toBe('foo is foo')
    expect(run('bar')).toBe('bar is bar')
    expect(run('john')).toBe('i do not know')
  })
  it('should run a next code by condition with order', () => {
    const run = condition(
      [
        //
        (item: string) => item === 'foo',
        (item) => `${item} is foo`,
      ],
      () => 'i do not know',
      [
        // useless
        (item) => item === 'bar',
        (item) => `${item} is bar`,
      ],
    )
    expect(run('foo')).toBe('foo is foo')
    expect(run('bar')).toBe('i do not know')
    expect(run('john')).toBe('i do not know')
  })
})
