import {expect, expectTypeOf, it} from 'vitest'
import {isParameterTuple} from '../is-parameter-tuple'
import type {ParameterTuple} from '../types'

it.each([{values: [1]}, {values: [1, 2]}, {values: [1, 2, 3]}])(
  'should recognize a supported parameter tuple $values',
  ({values}) => {
    const input: ReadonlyArray<number> = values
    expect(isParameterTuple(input)).toBe(true)
    if (isParameterTuple(input)) {
      expectTypeOf(input).toEqualTypeOf<ParameterTuple<number>>()
    }
  },
)

it.each([{values: []}, {values: [1, 2, 3, 4]}])(
  'should reject an unsupported parameter count $values',
  ({values}) => {
    expect(isParameterTuple(values)).toBe(false)
  },
)
