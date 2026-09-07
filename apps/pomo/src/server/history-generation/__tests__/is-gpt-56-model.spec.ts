import {expect, it} from 'vitest'

import {isGpt56Model} from '../is-gpt-56-model'

it.each([
  ['gpt-5.6', true],
  ['gpt-5.6-sol', true],
  ['gpt-5.6-terra', true],
  ['gpt-5.5', false],
  ['gpt-5.60', false],
] as const)('should classify %s', (model, expected) => {
  expect(isGpt56Model(model)).toBe(expected)
})
