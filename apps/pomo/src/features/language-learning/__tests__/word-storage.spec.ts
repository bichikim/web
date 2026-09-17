/** @vitest-environment jsdom */

import {describe, expect, it, vi} from 'vitest'

import type {LanguageLearningEventTarget, LanguageLearningStorage} from '../storage'
import {
  appendLanguageLearningWords,
  deleteLanguageLearningWord,
  readLanguageLearningWords,
  setLanguageLearningWordMemorized,
} from '../word-storage'

const createStorage = (): LanguageLearningStorage => {
  const values = new Map<string, string>()
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
  }
}

const createEvents = (): LanguageLearningEventTarget => {
  const events = new EventTarget()
  vi.spyOn(events, 'dispatchEvent')
  return events
}

it('should preserve word deduplication, memorization, deletion, and events per injected store', () => {
  const storage = createStorage()
  const events = createEvents()
  const options = {events, storage}

  expect(appendLanguageLearningWords('en', ['Home', 'wave', 'home'], options)).toEqual({
    addedCount: 2,
    skippedCount: 1,
  })
  expect(appendLanguageLearningWords('ja', ['家'], options)).toEqual({
    addedCount: 1,
    skippedCount: 0,
  })
  setLanguageLearningWordMemorized({language: 'en', memorized: true, value: 'Home'}, options)
  deleteLanguageLearningWord('en', 'wave', options)

  expect(readLanguageLearningWords({storage})).toMatchObject([
    {language: 'en', memorized: true, value: 'Home', version: 1},
    {language: 'ja', memorized: false, value: '家', version: 1},
  ])
  expect(events.dispatchEvent).toHaveBeenCalledTimes(4)
})
