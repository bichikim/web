import {describe, expect, it} from 'vitest'

import {
  resolveSupertonicLanguage,
  SUPERTONIC_LANGUAGE_OPTIONS,
  SUPERTONIC_LANGUAGES,
} from '../language'

describe('Supertonic language options', () => {
  it('should expose exactly one picker option for every supported language token', () => {
    const optionValues = SUPERTONIC_LANGUAGE_OPTIONS.map((option) => option.value)

    expect(new Set(optionValues).size).toBe(optionValues.length)
    expect([...optionValues].sort()).toEqual([...SUPERTONIC_LANGUAGES].sort())
  })
})

describe('resolveSupertonicLanguage', () => {
  it('should resolve supported HTML language tags to their primary language', () => {
    expect(resolveSupertonicLanguage('ko-KR')).toBe('ko')
    expect(resolveSupertonicLanguage('EN-us')).toBe('en')
    expect(resolveSupertonicLanguage(' pt_BR ')).toBe('pt')
  })

  it('should use the language-agnostic token for unsupported or empty tags', () => {
    expect(resolveSupertonicLanguage('zh-Hans')).toBe('na')
    expect(resolveSupertonicLanguage('')).toBe('na')
  })
})
