import {expect, it} from 'vitest'

import {
  appendLanguageLearningWords,
  readLanguageLearningWords,
} from '../features/language-learning/word-storage'

const createStorage = () => {
  const map = new Map<string, string>()
  return {
    getItem: (key: string) => map.get(key) ?? null,
    setItem: (key: string, value: string) => {
      map.set(key, value)
    },
  } as Storage
}

it('should dedupe Korean words that differ only by Unicode normalization form', () => {
  const storage = createStorage()
  const options = {storage}
  const composed = '한글'
  const decomposed = composed.normalize('NFD')

  expect(appendLanguageLearningWords('ko', [composed], options)).toEqual({
    addedCount: 1,
    skippedCount: 0,
  })
  expect(appendLanguageLearningWords('ko', [decomposed], options)).toEqual({
    addedCount: 0,
    skippedCount: 1,
  })
  expect(readLanguageLearningWords(options)).toHaveLength(1)
})
