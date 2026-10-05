import {ENGLISH_TITLE_ABBREVIATIONS} from 'src/utils/english-title-abbreviation'
import type {LanguageLearningLanguage} from './schema'

export const LANGUAGE_LEARNING_SENTENCE_LIMITS = {
  en: {characters: 180, words: 30},
  ja: {characters: 90, words: null},
  ko: {characters: 90, words: null},
} as const satisfies Record<
  LanguageLearningLanguage,
  {readonly characters: number; readonly words: number | null}
>

const ENDING_PATTERN = /[.!?。！？…]$/u
const TRAILING_SYMBOL_PATTERN = /^\p{S}$/u
const TRAILING_MARK_PATTERN = /^[\uFE0E\uFE0F\u20E0]$/u
const KEYCAP_BASE_PATTERN = /^[#*0-9]$/u
const EMOJI_TAG_BASE_PATTERN = /^\p{Extended_Pictographic}$/u
const EMOJI_TAG_SPEC_PATTERN = /^[\u{E0020}-\u{E007E}]$/u
const EMOJI_TAG_END_CHARACTER = '\u{E007F}'
const EMOJI_MODIFIER_BASE_PATTERN = /^\p{Emoji_Modifier_Base}$/u
const EMOJI_MODIFIER_PATTERN = /^\p{Emoji_Modifier}$/u
const WHITE_SPACE_CHARACTER_PATTERN = /^\p{White_Space}$/u
const INTERNAL_ENDING_PATTERN =
  /(?:[!?。！？]+(?![!?。！？])|(?<=\d)\.(?![\d.])|(?<!\d)\.(?!\.)).+/u
const QUOTED_TEXT_PATTERN = /"[^"]*"|“[^”]*”|‘[^’]*’|「[^」]*」|『[^』]*』/gu
const ENGLISH_ABBREVIATION_PATTERN = new RegExp(
  `(?:^|\\s)(?:${ENGLISH_TITLE_ABBREVIATIONS.join('|')}|[A-Z])\\.\\s*$`,
  'iu',
)
const INTERNAL_LATIN_ABBREVIATION_PATTERN = new RegExp(
  `\\b(?:(?:${ENGLISH_TITLE_ABBREVIATIONS.join('|')})\\.|(?:[A-Z]\\.)+)`,
  'giu',
)
const WRAPPING_QUOTES_PATTERN = /^["\uFF02'“”‘’「」『』].*["\uFF02'“”‘’「」『』]$/u
const MATCHING_WRAPPING_QUOTES_PATTERN =
  /^(?:"[^"]*"|\uFF02.*\uFF02|'.*'|“.*”|‘.*’|「.*」|『.*』)$/u
const LEADING_MARKER_PATTERN = /^(?:[-*•]|\d+(?:\.|\)))\s+/u

const getKeycapBaseIndex = (characters: readonly string[], index: number) => {
  if (characters[index] !== '\u20E3') {
    return -1
  }

  const variationSelectorIndex = index - 1
  const keycapBaseIndex =
    characters[variationSelectorIndex] === '\uFE0F'
      ? variationSelectorIndex - 1
      : variationSelectorIndex

  return keycapBaseIndex >= 0 && KEYCAP_BASE_PATTERN.test(characters[keycapBaseIndex] ?? '')
    ? keycapBaseIndex
    : -1
}

const getEmojiTagBaseIndex = (characters: readonly string[], index: number) => {
  const character = characters[index]
  const previousCharacter = characters[index - 1]

  if (
    character !== undefined &&
    EMOJI_MODIFIER_PATTERN.test(character) &&
    previousCharacter !== undefined &&
    EMOJI_MODIFIER_BASE_PATTERN.test(previousCharacter)
  ) {
    return index - 1
  }

  if (
    character === '\uFE0F' &&
    previousCharacter !== undefined &&
    EMOJI_TAG_BASE_PATTERN.test(previousCharacter)
  ) {
    return index - 1
  }

  return character !== undefined && EMOJI_TAG_BASE_PATTERN.test(character) ? index : -1
}

const getEmojiTagSequenceStartIndex = (characters: readonly string[], index: number) => {
  if (characters[index] !== EMOJI_TAG_END_CHARACTER) {
    return -1
  }

  let tagSpecificationIndex = index - 1

  while (
    tagSpecificationIndex >= 0 &&
    EMOJI_TAG_SPEC_PATTERN.test(characters[tagSpecificationIndex] ?? '')
  ) {
    tagSpecificationIndex -= 1
  }

  return tagSpecificationIndex === index - 1
    ? -1
    : getEmojiTagBaseIndex(characters, tagSpecificationIndex)
}

const stripTrailingSymbols = (sentence: string) => {
  const characters = Array.from(sentence)
  let index = characters.length - 1
  let hasTrailingSymbols = false
  let requiresPrecedingSymbol = false

  while (index >= 0) {
    const character = characters[index]!
    const emojiTagStartIndex = getEmojiTagSequenceStartIndex(characters, index)
    const keycapBaseIndex = getKeycapBaseIndex(characters, index)

    if (requiresPrecedingSymbol) {
      if (TRAILING_SYMBOL_PATTERN.test(character)) {
        requiresPrecedingSymbol = false
        hasTrailingSymbols = true
        index -= 1
      } else if (emojiTagStartIndex >= 0) {
        requiresPrecedingSymbol = false
        hasTrailingSymbols = true
        index = emojiTagStartIndex - 1
      } else if (keycapBaseIndex >= 0) {
        requiresPrecedingSymbol = false
        hasTrailingSymbols = true
        index = keycapBaseIndex - 1
      } else if (TRAILING_MARK_PATTERN.test(character)) {
        index -= 1
      } else {
        break
      }
    } else if (WHITE_SPACE_CHARACTER_PATTERN.test(character)) {
      index -= 1
    } else if (character === '\u200D' && hasTrailingSymbols) {
      requiresPrecedingSymbol = true
      index -= 1
    } else if (emojiTagStartIndex >= 0) {
      hasTrailingSymbols = true
      index = emojiTagStartIndex - 1
    } else if (keycapBaseIndex >= 0) {
      hasTrailingSymbols = true
      index = keycapBaseIndex - 1
    } else if (TRAILING_MARK_PATTERN.test(character)) {
      requiresPrecedingSymbol = true
      index -= 1
    } else if (TRAILING_SYMBOL_PATTERN.test(character)) {
      hasTrailingSymbols = true
      index -= 1
    } else {
      break
    }
  }

  if (!hasTrailingSymbols || requiresPrecedingSymbol) {
    return sentence
  }

  return characters.slice(0, index + 1).join('')
}

const hasMultipleEnglishSentences = (sentence: string) => {
  let previousSegment: string | undefined

  for (const {segment} of new Intl.Segmenter('en', {granularity: 'sentence'}).segment(sentence)) {
    if (previousSegment !== undefined && !ENGLISH_ABBREVIATION_PATTERN.test(previousSegment)) {
      return true
    }

    previousSegment = segment
  }

  return false
}

export const normalizeLanguageLearningSentence = (output: string) => {
  const singleLine = output.trim().replace(LEADING_MARKER_PATTERN, '')
  const hasWrappingQuotes = WRAPPING_QUOTES_PATTERN.test(singleLine)
  const hasMatchingWrappingQuotes = MATCHING_WRAPPING_QUOTES_PATTERN.test(singleLine)
  const unwrappedSentence = (hasWrappingQuotes ? singleLine.slice(1, -1) : singleLine).trim()
  const hasNestedMatchingWrappingQuotes =
    hasMatchingWrappingQuotes && MATCHING_WRAPPING_QUOTES_PATTERN.test(unwrappedSentence)
  const sentence = hasNestedMatchingWrappingQuotes
    ? unwrappedSentence.slice(1, -1).trim()
    : unwrappedSentence

  return hasWrappingQuotes &&
    !hasMatchingWrappingQuotes &&
    sentence.length > 0 &&
    !ENDING_PATTERN.test(stripTrailingSymbols(sentence))
    ? `${sentence}.`
    : sentence
}

export const isValidLanguageLearningSentence = (
  sentence: string,
  language: LanguageLearningLanguage,
) => {
  const limits = LANGUAGE_LEARNING_SENTENCE_LIMITS[language]
  const characterCount = [...sentence].length
  const sentenceWithoutTrailingSymbols = stripTrailingSymbols(sentence)
  const hasMultipleSentences =
    language === 'en'
      ? hasMultipleEnglishSentences(sentenceWithoutTrailingSymbols)
      : hasMultipleNonEnglishSentences(sentenceWithoutTrailingSymbols)

  if (
    sentence.length === 0 ||
    sentence.includes('\n') ||
    characterCount > limits.characters ||
    !ENDING_PATTERN.test(sentenceWithoutTrailingSymbols) ||
    hasMultipleSentences
  ) {
    return false
  }

  return (
    limits.words === null || sentenceWithoutTrailingSymbols.split(/\s+/u).length <= limits.words
  )
}

const hasMultipleNonEnglishSentences = (sentence: string) => {
  const sentenceWithoutQuotedText = sentence.replace(QUOTED_TEXT_PATTERN, '')
  const sentenceWithoutAbbreviationPeriods = sentenceWithoutQuotedText.replace(
    INTERNAL_LATIN_ABBREVIATION_PATTERN,
    (abbreviation) => abbreviation.replaceAll('.', ''),
  )

  return INTERNAL_ENDING_PATTERN.test(sentenceWithoutAbbreviationPeriods)
}
