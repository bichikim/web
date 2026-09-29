/** @vitest-environment jsdom */
import {expect, it} from 'vitest'

import {appendLanguageLearningWords, readLanguageLearningWords} from 'src/features/language-learning'

const createStorage = () => {
  const values = new Map<string, string>()
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
  }
}

it('should reject an empty string without throwing when appending language-learning words', () => {
  const storage = createStorage()

  expect(() => appendLanguageLearningWords('en', [''], {storage})).not.toThrow()
})

it('should not persist whitespace-only language-learning words', () => {
  const storage = createStorage()

  appendLanguageLearningWords('en', ['   '], {storage})

  expect(readLanguageLearningWords({storage})).toEqual([])
})
