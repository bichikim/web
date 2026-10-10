/** @vitest-environment jsdom */

import {describe, expect, it, vi} from 'vitest'

import {
  appendLanguageLearningWords,
  deleteLanguageLearningWords,
  type LanguageLearningEventTarget,
  type LanguageLearningStorage,
  readLanguageLearningWords,
  setLanguageLearningWordsMemorized,
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

it('should skip empty language learning words without throwing', () => {
  const storage = createStorage()

  expect(appendLanguageLearningWords('en', [''], {storage})).toEqual({
    addedCount: 0,
    skippedCount: 1,
  })
  expect(readLanguageLearningWords({storage})).toEqual([])
})

it('should not persist whitespace-only language learning words', () => {
  const storage = createStorage()

  expect(appendLanguageLearningWords('en', ['   '], {storage})).toEqual({
    addedCount: 0,
    skippedCount: 1,
  })
  expect(readLanguageLearningWords({storage})).toEqual([])
})

it('should trim saved language learning words', () => {
  const storage = createStorage()

  expect(appendLanguageLearningWords('en', [' Home '], {storage})).toEqual({
    addedCount: 1,
    skippedCount: 0,
  })
  expect(readLanguageLearningWords({storage})).toMatchObject([{value: 'Home'}])
})

it('should append first spellings in input order without changing stored words', () => {
  const storage = createStorage()
  const events = createEvents()
  const options = {events, storage}
  writeLanguageLearningWords(
    [
      {
        createdAt: '2026-08-29T00:00:00.000Z',
        language: 'en',
        memorized: true,
        value: 'Home',
        version: 1,
      },
      {
        createdAt: '2026-08-29T00:00:01.000Z',
        language: 'ja',
        memorized: true,
        value: 'Wave',
        version: 1,
      },
    ],
    options,
  )
  const storedWords = readLanguageLearningWords(options)
  const input = Object.freeze([' home ', ' Wave ', '', 'wave', '\t', 'École', 'école', 'Next'])
  const write = vi.spyOn(storage, 'setItem')
  vi.mocked(events.dispatchEvent).mockClear()

  expect(appendLanguageLearningWords('en', input, options)).toEqual({
    addedCount: 3,
    skippedCount: 5,
  })
  const words = readLanguageLearningWords(options)
  expect(words.slice(0, 2)).toEqual(storedWords)
  expect(words.slice(2)).toEqual([
    {createdAt: expect.any(String), language: 'en', memorized: false, value: 'Wave', version: 1},
    {createdAt: words[2]?.createdAt, language: 'en', memorized: false, value: 'École', version: 1},
    {createdAt: words[2]?.createdAt, language: 'en', memorized: false, value: 'Next', version: 1},
  ])
  expect(write).toHaveBeenCalledOnce()
  expect(events.dispatchEvent).toHaveBeenCalledOnce()
})

it.each([{values: []}, {values: [' ', 'HOME', ' home ']}])(
  'should leave storage and events unchanged when every input is skipped: $values',
  ({values}) => {
    const storage = createStorage()
    const events = createEvents()
    const options = {events, storage}
    appendLanguageLearningWords('en', ['Home'], options)
    const storedWords = readLanguageLearningWords(options)
    const write = vi.spyOn(storage, 'setItem')
    vi.mocked(events.dispatchEvent).mockClear()

    expect(appendLanguageLearningWords('en', values, options)).toEqual({
      addedCount: 0,
      skippedCount: values.length,
    })
    expect(readLanguageLearningWords(options)).toEqual(storedWords)
    expect(write).not.toHaveBeenCalled()
    expect(events.dispatchEvent).not.toHaveBeenCalled()
  },
)

it('should propagate a failed append without announcing or changing stored words', () => {
  const storage = createStorage()
  const events = createEvents()
  const options = {events, storage}
  appendLanguageLearningWords('en', ['Home'], options)
  const storedWords = readLanguageLearningWords(options)
  const failure = new Error('storage full')
  const write = vi.spyOn(storage, 'setItem').mockImplementation(() => {
    throw failure
  })
  vi.mocked(events.dispatchEvent).mockClear()

  expect(() => appendLanguageLearningWords('en', ['Wave', 'wave'], options)).toThrow(failure)
  expect(readLanguageLearningWords(options)).toEqual(storedWords)
  expect(write).toHaveBeenCalledOnce()
  expect(events.dispatchEvent).not.toHaveBeenCalled()
})

it('should match word identity without regard to case for memorization and deletion', () => {
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
  setLanguageLearningWordsMemorized({language: 'en', memorized: true, values: ['home']}, options)
  deleteLanguageLearningWords('en', ['WAVE'], options)

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

it.each([
  {first: '한글', second: '한글'.normalize('NFD')},
  {first: '한글'.normalize('NFD'), second: '한글'},
])('should deduplicate canonically equivalent Korean words in either order', ({first, second}) => {
  const storage = createStorage()
  const options = {storage}

  expect(appendLanguageLearningWords('ko', [first], options)).toEqual({
    addedCount: 1,
    skippedCount: 0,
  })
  const storedWords = readLanguageLearningWords(options)

  expect(appendLanguageLearningWords('ko', [second], options)).toEqual({
    addedCount: 0,
    skippedCount: 1,
  })
  expect(readLanguageLearningWords(options)).toEqual(storedWords)
  expect(readLanguageLearningWords(options).map((word) => word.value)).toEqual([first])
})

it.each([
  {first: '한글', second: '한글'.normalize('NFD')},
  {first: '한글'.normalize('NFD'), second: '한글'},
])('should keep the first canonical spelling in an append batch', ({first, second}) => {
  const storage = createStorage()
  const options = {storage}

  expect(appendLanguageLearningWords('ko', [first, second], options)).toEqual({
    addedCount: 1,
    skippedCount: 1,
  })
  expect(readLanguageLearningWords(options).map((word) => word.value)).toEqual([first])
})

it('should keep canonical word identity separate by language', () => {
  const storage = createStorage()
  const options = {storage}

  expect(appendLanguageLearningWords('ko', ['한글'], options)).toEqual({
    addedCount: 1,
    skippedCount: 0,
  })
  expect(appendLanguageLearningWords('ja', ['한글'.normalize('NFD')], options)).toEqual({
    addedCount: 1,
    skippedCount: 0,
  })
  expect(
    readLanguageLearningWords(options).map(({language, value}) => ({language, value})),
  ).toEqual([
    {language: 'ko', value: '한글'},
    {language: 'ja', value: '한글'.normalize('NFD')},
  ])
})

it('should preserve case matching without compatibility folding or emoji variation folding', () => {
  const storage = createStorage()
  const options = {storage}

  expect(appendLanguageLearningWords('en', ['École', 'E\u0301COLE'], options)).toEqual({
    addedCount: 1,
    skippedCount: 1,
  })
  expect(appendLanguageLearningWords('ko', ['가', 'ㄱㅏ'], options)).toEqual({
    addedCount: 2,
    skippedCount: 0,
  })
  expect(appendLanguageLearningWords('en', ['🙂', '🙂\uFE0F'], options)).toEqual({
    addedCount: 2,
    skippedCount: 0,
  })
  expect(readLanguageLearningWords(options).map((word) => word.value)).toEqual([
    'École',
    '가',
    'ㄱㅏ',
    '🙂',
    '🙂\uFE0F',
  ])
})

it('should retain existing canonical spellings when writing an unrelated word', () => {
  const storage = createStorage()
  const options = {storage}
  const existingWords = [
    {
      createdAt: '2026-08-29T00:00:00.000Z',
      language: 'ko' as const,
      memorized: false,
      value: '한글',
      version: 1 as const,
    },
    {
      createdAt: '2026-08-29T00:00:01.000Z',
      language: 'ko' as const,
      memorized: true,
      value: '한글'.normalize('NFD'),
      version: 1 as const,
    },
  ]

  writeLanguageLearningWords(existingWords, options)
  expect(readLanguageLearningWords(options)).toEqual(existingWords)

  expect(appendLanguageLearningWords('ko', ['새 단어'], options)).toEqual({
    addedCount: 1,
    skippedCount: 0,
  })
  expect(readLanguageLearningWords(options).slice(0, existingWords.length)).toEqual(existingWords)
  expect(readLanguageLearningWords(options).map((word) => word.value)).toEqual([
    '한글',
    '한글'.normalize('NFD'),
    '새 단어',
  ])
})

it('should delete only the previously selected canonical spelling', () => {
  const storage = createStorage()
  const options = {storage}
  const composedWord = {
    createdAt: '2026-08-29T00:00:00.000Z',
    language: 'ko' as const,
    memorized: false,
    value: '한글',
    version: 1 as const,
  }
  const decomposedWord = {...composedWord, value: composedWord.value.normalize('NFD')}

  writeLanguageLearningWords([composedWord, decomposedWord], options)
  deleteLanguageLearningWords('ko', [composedWord.value], options)

  expect(readLanguageLearningWords(options)).toEqual([decomposedWord])
})
