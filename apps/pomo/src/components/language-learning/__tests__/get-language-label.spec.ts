import {afterEach, expect, it, vi} from 'vitest'
import * as m from '@paraglide/message'
import type {LanguageLearningLanguage} from '../../../features/language-learning'
import {getLanguageLabel} from '../get-language-label'

vi.mock('@paraglide/message', () => ({
  learning_language_en: vi.fn(),
  learning_language_ja: vi.fn(),
  learning_language_ko: vi.fn(),
}))

afterEach(() => {
  vi.resetAllMocks()
})

const translations = {
  en: vi.mocked(m.learning_language_en),
  ja: vi.mocked(m.learning_language_ja),
  ko: vi.mocked(m.learning_language_ko),
}

it.each(['en', 'ja', 'ko'] as const)(
  'should read only the current %s translation on each call',
  (language) => {
    const message = translations[language]
    message.mockReturnValue('first' as ReturnType<typeof m.learning_language_en>)
    expect(getLanguageLabel(language)).toBe('first')

    message.mockReturnValue('second' as ReturnType<typeof m.learning_language_en>)
    expect(getLanguageLabel(language)).toBe('second')

    expect(message).toHaveBeenCalledTimes(2)
    expect(message.mock.calls).toEqual([[], []])
    for (const [name, translation] of Object.entries(translations)) {
      if (name !== language) {
        expect(translation).not.toHaveBeenCalled()
      }
    }
  },
)

it.each(['en', 'ja', 'ko'] as const)('should propagate the %s translation failure', (language) => {
  const failure = new Error('translation failed')
  translations[language].mockImplementation(() => {
    throw failure
  })

  expect(() => getLanguageLabel(language)).toThrow(failure)
})

it.each(['fr', null, undefined])(
  'should preserve the unsupported runtime language fallthrough for %s',
  (language) => {
    expect(getLanguageLabel(language as LanguageLearningLanguage)).toBeUndefined()
    for (const translation of Object.values(m)) {
      expect(translation).not.toHaveBeenCalled()
    }
  },
)
