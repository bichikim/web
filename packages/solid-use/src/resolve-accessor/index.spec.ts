import {createRoot, createSignal} from 'solid-js'
import {describe, expect, expectTypeOf, it} from 'vitest'
import {resolveAccessor, resolveAccessors} from './'

describe('resolveAccessor', () => {
  it.each([
    {result: 'foo', value: 'foo'},
    {result: 'foo', value: () => 'foo'},
    {result: 'foo', value: createSignal('foo')[0]},
  ])('should resolve accessor', ({value, result}) => {
    expect(resolveAccessor(value)()).toBe(result)
  })
})

describe('actual uses', () => {
  it('should resolve accessor in real solid js component system', () =>
    createRoot((dispose) => {
      const [value] = createSignal('foo')
      const valueAccessor = resolveAccessor(value)

      expect(valueAccessor()).toBe('foo')
      dispose()
    }))
})

describe('resolveAccessors', () => {
  it.each([
    //
    {result: 'foo', value: createSignal('foo')[0]},
    {result: ['foo', 'bar'], value: [createSignal('foo')[0], createSignal('bar')[0]]},
  ])('should resolve accessors', ({value, result}) => {
    expect(resolveAccessors(value as any)()).toEqual(result)
  })

  it('typing many accessors', () => {
    const [value1] = createSignal('foo')
    const [value2] = createSignal('bar')
    const [value3] = createSignal('bar1')
    const [value4] = createSignal('bar2')
    const [value5] = createSignal(5)

    {
      const result = resolveAccessors(value1)

      expectTypeOf<() => string>(result)
    }

    {
      const result = resolveAccessors([value1])

      expectTypeOf<() => [string]>(result)
    }

    {
      const result = resolveAccessors([value1, value2])

      expectTypeOf<() => string[]>(result)
    }

    {
      const result = resolveAccessors([value1, value2, value3])

      expectTypeOf<() => string[]>(result)
    }

    {
      const result = resolveAccessors([value1, value2, value3, value4])

      expectTypeOf<() => string[]>(result)
    }

    {
      const result = resolveAccessors([value1, value2, value3, value4, value5])

      expectTypeOf<() => [string, string, string, string, number]>(result)
    }
  })
})
