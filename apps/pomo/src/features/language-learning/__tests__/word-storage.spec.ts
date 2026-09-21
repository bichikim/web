/** @vitest-environment jsdom */

import {describe, expect, it, vi} from 'vitest'

import {
  appendLanguageLearningWords,
  deleteLanguageLearningWord,
  type LanguageLearningEventTarget,
  type LanguageLearningStorage,
  readLanguageLearningWords,
  setLanguageLearningWordMemorized,
  writeLanguageLearningWords,
} from '../index'

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

it('should deduplicate directly written words by language and case-insensitive value', () => {
  const storage = createStorage()
  const options = {storage}

  writeLanguageLearningWords(
    [
      {
        createdAt: '2026-08-29T00:00:00.000Z',
        language: 'en',
        memorized: false,
        value: 'Home',
        version: 1,
      },
      {
        createdAt: '2026-08-29T00:00:01.000Z',
        language: 'en',
        memorized: true,
        value: 'home',
        version: 1,
      },
      {
        createdAt: '2026-08-29T00:00:02.000Z',
        language: 'ja',
        memorized: false,
        value: 'HOME',
        version: 1,
      },
      {
        createdAt: '2026-08-29T00:00:03.000Z',
        language: 'en',
        memorized: false,
        value: 'Wave',
        version: 1,
      },
      {
        createdAt: '2026-08-29T00:00:04.000Z',
        language: 'en',
        memorized: false,
        value: 'wave',
        version: 1,
      },
    ],
    options,
  )

  expect(
    readLanguageLearningWords(options).map(({language, value}) => ({language, value})),
  ).toEqual([
    {language: 'en', value: 'Home'},
    {language: 'ja', value: 'HOME'},
    {language: 'en', value: 'Wave'},
  ])
})
