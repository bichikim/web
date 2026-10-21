import type {SupertonicLanguage} from '../language'
import {normalizeEnglishSpeechText} from './normalize-english-speech-text'
import {normalizeKoreanSpeechText} from './normalize-korean-speech-text'
import {
  KOREAN_CLOCK_RANGE_SEPARATOR_PATTERN_SOURCE,
  KOREAN_CLOCK_SUFFIX_PATTERN_SOURCE,
  KOREAN_DIGIT_PATTERN_SOURCE,
  NUMBER_TOKEN_START_PATTERN_SOURCE,
  UNSIGNED_INTEGER_PATTERN_SOURCE,
} from './number-patterns'
import {parseClockTime} from './parse-clock-time'

const RANGE_SEPARATOR_SOURCE = '(?:~|–|—|에서|부터|내지|to|through)'
const CLOCK_EDGE_LENGTH = 3
const PROTECTED_RANGE_NUMBER_SOURCE = `${UNSIGNED_INTEGER_PATTERN_SOURCE}(?:\\.\\d+)?`
const PROTECTED_URL_SOURCE = '(?:https?:\\/\\/|www\\.)\\S+'
const PROTECTED_NUMBER_SOURCE = [
  PROTECTED_URL_SOURCE,
  '[\\p{L}\\p{N}._%+-]+@[\\p{L}\\p{N}.-]+\\.[\\p{L}]{2,}',
  `\\b(?:between|from)\\s+${PROTECTED_RANGE_NUMBER_SOURCE}` +
    `\\s+(?:and|to|through)\\s+${PROTECTED_RANGE_NUMBER_SOURCE}\\b`,
  `(?<!\\d)${PROTECTED_RANGE_NUMBER_SOURCE}` +
    `\\s*${RANGE_SEPARATOR_SOURCE}\\s*${PROTECTED_RANGE_NUMBER_SOURCE}(?!\\d)`,
  '\\b(?:version|model|room|chapter|episode|id)\\s+\\d+(?:\\.\\d+)*(?:st|nd|rd|th)?\\b',
  '\\b\\d+(?:[.-]\\d+){2,}\\b',
].join('|')
const PROTECTED_NUMBER_PATTERN = new RegExp(PROTECTED_NUMBER_SOURCE, 'giu')
const COLON_CLOCK_RANGE_PATTERN = new RegExp(
  `${NUMBER_TOKEN_START_PATTERN_SOURCE}(?<!：)` +
    `(${KOREAN_DIGIT_PATTERN_SOURCE}{2})[:：](${KOREAN_DIGIT_PATTERN_SOURCE}{2})` +
    `\\s*${KOREAN_CLOCK_RANGE_SEPARATOR_PATTERN_SOURCE}\\s*` +
    `(${KOREAN_DIGIT_PATTERN_SOURCE}{2})[:：](${KOREAN_DIGIT_PATTERN_SOURCE}{2})` +
    `(?=${KOREAN_CLOCK_SUFFIX_PATTERN_SOURCE}|$|[,.!?…](?=$|\\s)|\\s+)`,
  'giu',
)

export interface NormalizeSpeechTextOptions {
  readonly maximumLength?: number
  readonly language: SupertonicLanguage
  readonly text: string
}

const getNormalizer = (
  language: SupertonicLanguage,
): ((text: string, contextPrefix?: string) => string) | null => {
  if (language === 'en') {
    return normalizeEnglishSpeechText
  }

  return language === 'ko' ? normalizeKoreanSpeechText : null
}

const getClockContextPrefix = (prefix: string): string =>
  prefix.replace(new RegExp(PROTECTED_URL_SOURCE, 'giu'), (url) =>
    /[?&][^?&#=\s]+=(?:오전|오후)?$/u.test(url) ? url : ' ',
  )

/** Produces deterministic model input while preserving ambiguous and unsupported number forms. */
export const normalizeSpeechText = (options: NormalizeSpeechTextOptions): string => {
  const normalize = getNormalizer(options.language)

  if (normalize === null) {
    return options.text
  }

  const clockRanges =
    options.language === 'ko'
      ? Array.from(options.text.matchAll(COLON_CLOCK_RANGE_PATTERN)).filter(
          (match) =>
            parseClockTime(match[1]!, match[2]!) !== null &&
            parseClockTime(match[3]!, match[4]!) !== null,
        )
      : []
  const protectedNumbers = Array.from(options.text.matchAll(PROTECTED_NUMBER_PATTERN)).filter(
    (match) =>
      !clockRanges.some(
        (clock) =>
          clock.index + CLOCK_EDGE_LENGTH === match.index &&
          clock.index + clock[0].length - CLOCK_EDGE_LENGTH === match.index + match[0].length,
      ),
  )

  let result = ''
  let position = 0

  for (const match of protectedNumbers) {
    const {index} = match
    result += normalize(
      options.text.slice(position, index),
      getClockContextPrefix(options.text.slice(0, position)),
    )
    result += match[0]
    position = index + match[0].length
  }

  const normalized =
    result +
    normalize(options.text.slice(position), getClockContextPrefix(options.text.slice(0, position)))
  return Array.from(normalized).length <= (options.maximumLength ?? Infinity)
    ? normalized
    : options.text
}
