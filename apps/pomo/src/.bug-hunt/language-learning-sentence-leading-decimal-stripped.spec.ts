/** @vitest-environment node */
import {expect, it} from 'vitest'

import {
  isValidLanguageLearningSentence,
  normalizeLanguageLearningSentence,
} from '../features/language-learning/sentence'

it.each([
  ['en', '3.5 million people visit the park each year.'],
  ['ko', '1.5배 빠르게 달릴 수 있어요.'],
] as const)(
  'should keep a leading decimal number that is not a list marker (%s)',
  (language, output) => {
    expect(isValidLanguageLearningSentence(output, language)).toBe(true)

    expect(normalizeLanguageLearningSentence(output)).toBe(output)
  },
)

it('should still strip a real numbered list marker', () => {
  expect(normalizeLanguageLearningSentence('1. The cat sleeps.')).toBe('The cat sleeps.')
  expect(normalizeLanguageLearningSentence('2) The cat sleeps.')).toBe('The cat sleeps.')
})
