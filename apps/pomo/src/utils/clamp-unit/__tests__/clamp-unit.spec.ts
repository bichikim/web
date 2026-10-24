/** @vitest-environment node */
import {describe, expect, expectTypeOf, it} from 'vitest'

import {clampUnit} from '..'

describe('clampUnit', () => {
  it.each([
    [-1, 0],
    [-0.01, 0],
    [0, 0],
    [0.5, 0.5],
    [1, 1],
    [1.01, 1],
    [2, 1],
  ] as const)('should clamp %j to %j', (value, result) => {
    expect(clampUnit(value)).toBe(result)
  })

  it.each([undefined, NaN, Infinity, -Infinity])(
    'should return undefined for %s by default',
    (value) => {
      expect(clampUnit(value)).toBeUndefined()
    },
  )

  it('should return a configured fallback without clamping it', () => {
    expect(clampUnit(NaN, {fallback: -1})).toBe(-1)
    expect(clampUnit(undefined, {fallback: null})).toBeNull()
  })

  it('should apply a custom predicate instead of the default check', () => {
    const options = {fallback: 'invalid', isInvalid: (value: number | undefined) => value === 0.5}
    expect(clampUnit(0.5, options)).toBe('invalid')
    expect(clampUnit(Infinity, options)).toBe(1)
    expect(clampUnit(-Infinity, options)).toBe(0)
    expect(clampUnit(2, options)).toBe(1)
  })

  it('should keep missing inputs invalid with a custom predicate', () => {
    expect(clampUnit(undefined, {fallback: 0, isInvalid: () => false})).toBe(0)
  })

  it('should return undefined when a custom predicate rejects a value without a fallback', () => {
    expect(clampUnit(0.5, {isInvalid: () => true})).toBeUndefined()
  })

  it('should infer return types from fallback options', () => {
    expectTypeOf(clampUnit(0.5)).toEqualTypeOf<number | undefined>()
    expectTypeOf(clampUnit(NaN, {fallback: 0})).toEqualTypeOf<number>()
    expectTypeOf(clampUnit(NaN, {fallback: null})).toEqualTypeOf<number | null>()
    expectTypeOf(clampUnit(NaN, {fallback: 'invalid' as const})).toEqualTypeOf<number | 'invalid'>()
    const options: {fallback?: string} = {}
    expectTypeOf(clampUnit(NaN, options)).toEqualTypeOf<number | string | undefined>()
  })
})
