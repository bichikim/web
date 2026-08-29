/** @vitest-environment jsdom */

import {beforeEach, describe, expect, it, vi} from 'vitest'

import {
  appendLanguageLearningSentences,
  appendLanguageLearningWords,
  createLanguageLearningPrompt,
  deleteLanguageLearningSentence,
  deleteLanguageLearningWord,
  getUnmemorizedLanguageLearningWordValues,
  isValidLanguageLearningSentence,
  normalizeLanguageLearningSentence,
  parseLanguageLearningTags,
  readLanguageLearningSentences,
  readLanguageLearningWords,
  rollbackLanguageLearningDialogues,
  selectLanguageLearningPromptWords,
  selectRandomLanguageLearningWords,
  setLanguageLearningWordMemorized,
  writeLanguageLearningSentences,
  writeLanguageLearningWords,
} from '../index'

const STORED_SENTENCE = {
  createdAt: '2026-08-28T00:00:00.000Z',
  dialogueId: 'dialogue-1',
  language: 'en',
  tags: ['home'],
  text: 'I feel at home here.',
  version: 1,
} as const

beforeEach(() => {
  localStorage.clear()
  vi.clearAllMocks()
})

describe('language learning tags', () => {
  it('should trim, deduplicate, limit, and split pasted tags', () => {
    expect(parseLanguageLearningTags(' home,HOME\nwave, ')).toEqual(['home', 'wave'])
    expect(parseLanguageLearningTags(`${'x'.repeat(40)},a,b,c,d,e,f,g,h,i,j,k`)).toEqual([
      'x'.repeat(30),
      'a',
      'b',
      'c',
      'd',
      'e',
      'f',
      'g',
      'h',
      'i',
    ])
  })
})

describe('language learning sentences', () => {
  it('should normalize wrappers and enforce one language-specific sentence', () => {
    expect(normalizeLanguageLearningSentence('  1. “I am home.”  ')).toBe('I am home.')
    expect(isValidLanguageLearningSentence('I am home.', 'en')).toBe(true)
    expect(isValidLanguageLearningSentence('One. Two.', 'en')).toBe(false)
    expect(isValidLanguageLearningSentence(`${'word '.repeat(31).trim()}.`, 'en')).toBe(false)
    expect(isValidLanguageLearningSentence(`${'가'.repeat(90)}.`, 'ko')).toBe(false)
    expect(isValidLanguageLearningSentence('ただいま。', 'ja')).toBe(true)
  })

  it('should create a constrained multilingual prompt with prior results', () => {
    expect(
      createLanguageLearningPrompt({
        existingSentences: ['I am home.'],
        language: 'en',
        tags: ['home', 'wave'],
        wordRequirement: 'all',
      }),
    ).toContain('at most 30 words')
    expect(
      createLanguageLearningPrompt({
        existingSentences: [],
        language: 'ja',
        tags: ['家', '玄関', '静か'],
        wordRequirement: 'at-least-one',
      }),
    ).toContain('Use at least one of these provided words or phrases naturally: 家, 玄関, 静か')
    expect(
      createLanguageLearningPrompt({
        existingSentences: [],
        language: 'en',
        tags: ['acknowledge', 'different perspective'],
        wordRequirement: 'all',
      }),
    ).toContain('You may change tense, conjugation, inflection, number, or case when natural.')
    expect(
      createLanguageLearningPrompt({
        existingSentences: [],
        language: 'en',
        tags: ['acknowledge'],
        wordRequirement: 'all',
      }),
    ).toContain(
      'You may also change part of speech when natural, but preserve the original meaning.',
    )
    expect(
      createLanguageLearningPrompt({
        existingSentences: [],
        language: 'ja',
        tags: ['家'],
        wordRequirement: 'all',
      }),
    ).toContain('Maximum length: 90 characters')
  })
})

describe('language learning random word selection', () => {
  const values = [
    'one',
    'two',
    'three',
    'four',
    'five',
    'six',
    'seven',
    'eight',
    'nine',
    'ten',
    'eleven',
  ]

  it('should return no words when fewer than three are available', () => {
    expect(selectRandomLanguageLearningWords({values: ['one', 'two']})).toEqual([])
  })

  it('should randomly select between three and ten unique saved words', () => {
    const minimum = selectRandomLanguageLearningWords({random: () => 0, values})
    const maximum = selectRandomLanguageLearningWords({random: () => 0.999, values})

    expect(minimum).toHaveLength(3)
    expect(maximum).toHaveLength(10)
    expect(new Set(maximum).size).toBe(10)
    expect(maximum.every((value) => values.includes(value))).toBe(true)
  })

  it('should cap direct words at two and route saved words through random selection', () => {
    expect(
      selectLanguageLearningPromptWords({
        directInput: 'three',
        directWords: ['one', 'two'],
        savedWords: [],
        source: 'direct',
      }),
    ).toEqual(['one', 'two'])
    expect(
      selectLanguageLearningPromptWords({
        directInput: '',
        directWords: [],
        random: () => 0,
        savedWords: values,
        source: 'saved',
      }),
    ).toHaveLength(3)
  })

  it('should exclude memorized and other-language words from prompt candidates', () => {
    expect(
      getUnmemorizedLanguageLearningWordValues({
        language: 'en',
        words: [
          {
            createdAt: '2026-08-29T00:00:00.000Z',
            language: 'en',
            memorized: false,
            value: 'active',
            version: 1,
          },
          {
            createdAt: '2026-08-29T00:00:00.000Z',
            language: 'en',
            memorized: true,
            value: 'memorized',
            version: 1,
          },
          {
            createdAt: '2026-08-29T00:00:00.000Z',
            language: 'ja',
            memorized: false,
            value: '別',
            version: 1,
          },
        ],
      }),
    ).toEqual(['active'])
  })
})

describe('language learning storage', () => {
  it('should write, append, read, and announce stored sentences', () => {
    const listener = vi.fn()
    window.addEventListener('pomo:language-learning:sentences-changed', listener)
    writeLanguageLearningSentences([STORED_SENTENCE])
    appendLanguageLearningSentences([
      {...STORED_SENTENCE, dialogueId: 'dialogue-2', text: 'Welcome home.'},
    ])
    deleteLanguageLearningSentence('dialogue-1')

    expect(readLanguageLearningSentences()).toEqual([
      {...STORED_SENTENCE, dialogueId: 'dialogue-2', text: 'Welcome home.'},
    ])
    expect(listener).toHaveBeenCalledTimes(3)
  })

  it('should recover from malformed stored data', () => {
    const warning = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    localStorage.setItem('pomo:language-learning:sentences:v1', '{bad')

    expect(readLanguageLearningSentences()).toEqual([])
    expect(warning).toHaveBeenCalledOnce()
  })
})

describe('language learning dialogue rollback', () => {
  it('should attempt every rollback and report failures without rejecting', async () => {
    const deleteDialogue = vi.fn(async (dialogueId: string) => {
      if (dialogueId === 'dialogue-1') {
        throw new Error('delete failed')
      }
    })

    await expect(
      rollbackLanguageLearningDialogues({
        deleteDialogue,
        dialogueIds: ['dialogue-1', 'dialogue-2'],
      }),
    ).resolves.toEqual([expect.objectContaining({message: 'delete failed'})])
    expect(deleteDialogue).toHaveBeenCalledTimes(2)
  })
})

describe('language learning word storage', () => {
  it('should store language-specific words without duplicates and announce changes', () => {
    const listener = vi.fn()
    window.addEventListener('pomo:language-learning:words-changed', listener)

    appendLanguageLearningWords('en', ['Home', 'wave', 'home'])
    appendLanguageLearningWords('ja', ['家'])
    appendLanguageLearningWords('en', ['HOME', 'perspective'])
    setLanguageLearningWordMemorized({language: 'en', memorized: true, value: 'Home'})
    deleteLanguageLearningWord('en', 'wave')

    expect(readLanguageLearningWords()).toMatchObject([
      {language: 'en', memorized: true, value: 'Home', version: 1},
      {language: 'ja', memorized: false, value: '家', version: 1},
      {language: 'en', memorized: false, value: 'perspective', version: 1},
    ])
    expect(listener).toHaveBeenCalledTimes(5)
  })

  it('should recover from malformed stored words', () => {
    const warning = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    localStorage.setItem('pomo:language-learning:words:v1', '{bad')

    expect(readLanguageLearningWords()).toEqual([])
    expect(warning).toHaveBeenCalledOnce()
  })

  it('should write an explicit word collection', () => {
    writeLanguageLearningWords([
      {
        createdAt: '2026-08-29T00:00:00.000Z',
        language: 'ko',
        memorized: false,
        value: '집',
        version: 1,
      },
    ])

    expect(readLanguageLearningWords()).toHaveLength(1)
  })

  it('should migrate existing words without a memorized state as not memorized', () => {
    localStorage.setItem(
      'pomo:language-learning:words:v1',
      JSON.stringify([
        {
          createdAt: '2026-08-29T00:00:00.000Z',
          language: 'en',
          value: 'legacy',
          version: 1,
        },
      ]),
    )

    expect(readLanguageLearningWords()).toMatchObject([{memorized: false, value: 'legacy'}])
  })
})
