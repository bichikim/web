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
const LEADING_MARKER_PATTERN = /^(?:[-*•]|\d+(?:\.|\)))\s*/u

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
    !ENDING_PATTERN.test(sentence)
    ? `${sentence}.`
    : sentence
}

export const isValidLanguageLearningSentence = (
  sentence: string,
  language: LanguageLearningLanguage,
) => {
  const limits = LANGUAGE_LEARNING_SENTENCE_LIMITS[language]
  const characterCount = [...sentence].length
  const hasMultipleSentences =
    language === 'en'
      ? hasMultipleEnglishSentences(sentence)
      : hasMultipleNonEnglishSentences(sentence)

  if (
    sentence.length === 0 ||
    sentence.includes('\n') ||
    characterCount > limits.characters ||
    !ENDING_PATTERN.test(sentence) ||
    hasMultipleSentences
  ) {
    return false
  }

  return limits.words === null || sentence.split(/\s+/u).length <= limits.words
}

const hasMultipleNonEnglishSentences = (sentence: string) => {
  const sentenceWithoutQuotedText = sentence.replace(QUOTED_TEXT_PATTERN, '')
  const sentenceWithoutAbbreviationPeriods = sentenceWithoutQuotedText.replace(
    INTERNAL_LATIN_ABBREVIATION_PATTERN,
    (abbreviation) => abbreviation.replaceAll('.', ''),
  )

  return INTERNAL_ENDING_PATTERN.test(sentenceWithoutAbbreviationPeriods)
}
