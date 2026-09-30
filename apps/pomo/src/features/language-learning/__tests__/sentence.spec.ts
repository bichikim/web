import {describe, expect, it} from 'vitest'

import {isValidLanguageLearningSentence, normalizeLanguageLearningSentence} from '../sentence'

describe('isValidLanguageLearningSentence', () => {
  it('should accept decimal points in Korean and Japanese sentences', () => {
    expect(isValidLanguageLearningSentence('원주율은 3.14로 계산해요.', 'ko')).toBe(true)
    expect(isValidLanguageLearningSentence('円周率は3.14として計算します。', 'ja')).toBe(true)
  })

  it('should accept Latin abbreviations in Korean and Japanese sentences', () => {
    expect(isValidLanguageLearningSentence('Dr. Kim은 의사예요.', 'ko')).toBe(true)
    expect(isValidLanguageLearningSentence('예를 들어 e.g. 이렇게 말해요.', 'ko')).toBe(true)
    expect(isValidLanguageLearningSentence('이것은 U.S. 이야기예요.', 'ko')).toBe(true)
    expect(isValidLanguageLearningSentence('Dr. Kimは医者です。', 'ja')).toBe(true)
    expect(isValidLanguageLearningSentence('例えばe.g.このように言います。', 'ja')).toBe(true)
    expect(isValidLanguageLearningSentence('これはU.S.の話です。', 'ja')).toBe(true)
  })

  it('should accept combined terminal punctuation in Korean and Japanese sentences', () => {
    expect(isValidLanguageLearningSentence('정말 그래요?!', 'ko')).toBe(true)
    expect(isValidLanguageLearningSentence('本当にそうですか?!', 'ja')).toBe(true)
    expect(isValidLanguageLearningSentence('정말 그래요？！', 'ko')).toBe(true)
  })

  it('should accept an English sentence followed by a trailing emoji', () => {
    expect(isValidLanguageLearningSentence('Hello world! 👋', 'en')).toBe(true)
  })

  it('should accept a Korean sentence followed by a trailing emoji', () => {
    expect(isValidLanguageLearningSentence('원주율은 3.14예요! 🎉', 'ko')).toBe(true)
  })

  it('should accept a Japanese sentence followed by a variation-selector emoji', () => {
    expect(isValidLanguageLearningSentence('今日は晴れです。☀️', 'ja')).toBe(true)
  })

  it('should accept trailing emoji sequences, keycap emoji, and symbols', () => {
    expect(isValidLanguageLearningSentence('Hello! 👩🏽‍💻', 'en')).toBe(true)
    expect(isValidLanguageLearningSentence('Hello! 🇺🇸', 'en')).toBe(true)
    expect(isValidLanguageLearningSentence('Hello! 1️⃣', 'en')).toBe(true)
    expect(isValidLanguageLearningSentence('Hello!👋', 'en')).toBe(true)
    expect(isValidLanguageLearningSentence('Keep going! ™', 'en')).toBe(true)
  })

  it('should count only English words before a trailing emoji suffix', () => {
    const thirtyWords = Array.from({length: 30}, () => 'word').join(' ')

    expect(isValidLanguageLearningSentence(`${thirtyWords}! 👋`, 'en')).toBe(true)
  })

  it('should reject a second sentence after an emoji and trailing words after punctuation', () => {
    expect(isValidLanguageLearningSentence('오늘은 맑아요! 🎉 내일도 맑아요.', 'ko')).toBe(false)
    expect(isValidLanguageLearningSentence('今日は晴れです。☀️ 明日も晴れです。', 'ja')).toBe(false)
    expect(isValidLanguageLearningSentence('Hello world! goodbye', 'en')).toBe(false)
    expect(isValidLanguageLearningSentence('Hello world! 2', 'en')).toBe(false)
    expect(isValidLanguageLearningSentence('Hello world 👋', 'en')).toBe(false)
    expect(isValidLanguageLearningSentence('Hello world! \u202E', 'en')).toBe(false)
    expect(isValidLanguageLearningSentence('Hello world! \u200B', 'en')).toBe(false)
  })

  it('should accept a Korean sentence with a question mark inside quoted dialogue', () => {
    expect(isValidLanguageLearningSentence('그는 "왜요?"라고 물었습니다.', 'ko')).toBe(true)
  })

  it('should accept a Japanese sentence with a question mark inside quoted dialogue', () => {
    expect(isValidLanguageLearningSentence('彼は「なぜ？」と聞きました。', 'ja')).toBe(true)
  })

  it('should reject multiple Korean and Japanese sentences', () => {
    expect(isValidLanguageLearningSentence('원주율은 3.14예요. 오늘은 날씨가 좋아요.', 'ko')).toBe(
      false,
    )
    expect(isValidLanguageLearningSentence('Dr. Kim은 의사예요. 오늘은 날씨가 좋아요.', 'ko')).toBe(
      false,
    )
    expect(
      isValidLanguageLearningSentence('円周率は3.14です。今日はよく晴れています。', 'ja'),
    ).toBe(false)
    expect(
      isValidLanguageLearningSentence(
        '例えばe.g.このように言います。今日はよく晴れています。',
        'ja',
      ),
    ).toBe(false)
  })

  it('should reject a second sentence after combined terminal punctuation', () => {
    expect(isValidLanguageLearningSentence('정말 그래요?! 오늘도 그래요.', 'ko')).toBe(false)
    expect(
      isValidLanguageLearningSentence('本当にそうですか？！今日はよく晴れています。', 'ja'),
    ).toBe(false)
  })
})

describe('normalizeLanguageLearningSentence', () => {
  it('should recover mismatched quote wrappers without dropping sentence endings', () => {
    const sentence = normalizeLanguageLearningSentence('"hello\'')
    const question = normalizeLanguageLearningSentence('"hello?\'')
    const sentenceWithEmoji = normalizeLanguageLearningSentence('"hello! 👋\'')

    expect(sentence).toBe('hello.')
    expect(isValidLanguageLearningSentence(sentence, 'en')).toBe(true)
    expect(question).toBe('hello?')
    expect(sentenceWithEmoji).toBe('hello! 👋')
    expect(isValidLanguageLearningSentence(sentenceWithEmoji, 'en')).toBe(true)
  })

  it('should remove nested matching ASCII quote wrappers', () => {
    const normalized = normalizeLanguageLearningSentence('"\'hello.\'"')
    const normalizedWithEmoji = normalizeLanguageLearningSentence('"\'hello! 👋\'"')

    expect(isValidLanguageLearningSentence('hello.', 'en')).toBe(true)
    expect(isValidLanguageLearningSentence("'hello.'", 'en')).toBe(false)
    expect(normalized).toBe('hello.')
    expect(isValidLanguageLearningSentence(normalized, 'en')).toBe(true)
    expect(normalizedWithEmoji).toBe('hello! 👋')
    expect(isValidLanguageLearningSentence(normalizedWithEmoji, 'en')).toBe(true)
  })

  it('should remove fullwidth double quote wrappers', () => {
    const normalized = normalizeLanguageLearningSentence('\uFF02hello.\uFF02')
    const normalizedWithEmoji = normalizeLanguageLearningSentence('\uFF02hello! 👋\uFF02')

    expect(isValidLanguageLearningSentence('hello.', 'en')).toBe(true)
    expect(normalized).toBe('hello.')
    expect(isValidLanguageLearningSentence(normalized, 'en')).toBe(true)
    expect(normalizedWithEmoji).toBe('hello! 👋')
    expect(isValidLanguageLearningSentence(normalizedWithEmoji, 'en')).toBe(true)
  })
})
