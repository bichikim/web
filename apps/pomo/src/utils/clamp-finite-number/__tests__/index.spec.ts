/** @vitest-environment node */
import {expect, expectTypeOf, it} from 'vitest'
import {clampFiniteNumber} from '..'

it.each([
  [undefined, undefined],
  [NaN, undefined],
  [Infinity, undefined],
  [-Infinity, undefined],
  [-5, 0],
  [25.5, 25.5],
  [120, 100],
])('should clamp %s to %s within percentage bounds', (value, expected) => {
  expect(clampFiniteNumber(value, 0, 100)).toBe(expected)
})

it.each([
  [-20, -10, 10, -10],
  [20, -10, 10, 10],
  [5, -10, 10, 5],
  [0.75, 0, 1, 0.75],
  [2, 0, 1, 1],
  [10, 5, 5, 5],
])('should clamp %s within [%s, %s] to %s', (value, min, max, expected) => {
  expect(clampFiniteNumber(value, min, max)).toBe(expected)
})

it('should return the configured fallback without clamping it', () => {
  expect(clampFiniteNumber(NaN, 0, 100, {fallback: -1})).toBe(-1)
  expect(clampFiniteNumber(Infinity, 0, 100, {fallback: null})).toBeNull()
})

it('should replace the default invalidity check with the supplied predicate', () => {
  const options = {fallback: 'invalid', isInvalid: (value: number | undefined) => value === 25}
  expect(clampFiniteNumber(25, 0, 100, options)).toBe('invalid')
  expect(clampFiniteNumber(Infinity, 0, 100, options)).toBe(100)
  expect(clampFiniteNumber(150, 0, 100, options)).toBe(100)
})

it('should treat missing values as invalid even when a custom predicate accepts them', () => {
  expect(clampFiniteNumber(undefined, 0, 100, {fallback: null, isInvalid: () => false})).toBeNull()
})

it('should use undefined when only a custom predicate is supplied', () => {
  expect(clampFiniteNumber(25, 0, 100, {isInvalid: () => true})).toBeUndefined()
})

it('should infer the return type from required and optional fallback values', () => {
  expectTypeOf(clampFiniteNumber(25, 0, 100)).toEqualTypeOf<number | undefined>()
  expectTypeOf(clampFiniteNumber(NaN, 0, 100, {fallback: 0})).toEqualTypeOf<number>()
  expectTypeOf(clampFiniteNumber(NaN, 0, 100, {fallback: null})).toEqualTypeOf<number | null>()
  expectTypeOf(clampFiniteNumber(NaN, 0, 100, {fallback: 'invalid' as const})).toEqualTypeOf<
    number | 'invalid'
  >()
  const options: {fallback?: string} = {}
  expectTypeOf(clampFiniteNumber(NaN, 0, 100, options)).toEqualTypeOf<number | string | undefined>()
  expectTypeOf(
    clampFiniteNumber(25, 0, 100, {
      isInvalid: (value) => {
        expectTypeOf(value).toEqualTypeOf<number | undefined>()
        return value === 25
      },
    }),
  ).toEqualTypeOf<number | undefined>()
})
