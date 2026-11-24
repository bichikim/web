/** @vitest-environment node */
import {expect, test} from 'vitest'
import {createNumberArrayIndex} from '../number-array-index'

test('should reference equal arrays by encounter order without changing the arrays', () => {
  const reference = createNumberArrayIndex()
  const first = Object.freeze([0.25, -0, 0.1])
  expect(reference(first)).toBeUndefined()
  expect(reference([1, 2])).toBeUndefined()
  expect(reference([...first])).toBe(0)
  expect(reference([1, 2])).toBe(1)
  expect(reference([0.25, 0, 0.1])).toBeUndefined()
})

test('should keep unequal coordinates distinct when their fingerprints collide', () => {
  const reference = createNumberArrayIndex()
  const collision = 7.302824517380985e-304
  expect(reference([0])).toBeUndefined()
  expect(reference([collision])).toBeUndefined()
  expect(reference([0])).toBe(0)
  expect(reference([collision])).toBe(1)
})
