/** @vitest-environment jsdom */

import {describe, expect, it, vi} from 'vitest'

import {
  appendLanguageLearningSentences,
  deleteLanguageLearningSentence,
  type LanguageLearningEventTarget,
  type LanguageLearningStorage,
  readLanguageLearningSentences,
  writeLanguageLearningSentences,
} from '../storage'

const SENTENCE = {
  createdAt: '2026-08-28T00:00:00.000Z',
  dialogueId: 'dialogue-1',
  language: 'en',
  tags: ['home'],
  text: 'I feel at home here.',
  version: 1,
} as const

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

describe('language learning sentence storage boundary', () => {
  it('should persist and announce sentences through the injected boundaries', () => {
    const storage = createStorage()
    const events = createEvents()

    writeLanguageLearningSentences([SENTENCE], {events, storage})
    appendLanguageLearningSentences(
      [{...SENTENCE, dialogueId: 'dialogue-2', text: 'Welcome home.'}],
      {events, storage},
    )
    deleteLanguageLearningSentence('dialogue-1', {events, storage})

    expect(readLanguageLearningSentences({storage})).toEqual([
      {...SENTENCE, dialogueId: 'dialogue-2', text: 'Welcome home.'},
    ])
    expect(events.dispatchEvent).toHaveBeenCalledTimes(3)
  })

  it('should isolate malformed data in the injected store', () => {
    const storage: LanguageLearningStorage = {
      getItem: () => '{bad',
      setItem: () => undefined,
    }
    const warning = vi.spyOn(console, 'warn').mockImplementation(() => undefined)

    expect(readLanguageLearningSentences({storage})).toEqual([])
    expect(warning).toHaveBeenCalledOnce()
  })
})
