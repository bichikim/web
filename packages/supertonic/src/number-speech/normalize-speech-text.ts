import type {SupertonicLanguage} from '../language'
import {normalizeEnglishSpeechText} from './normalize-english-speech-text'
import {normalizeKoreanSpeechText} from './normalize-korean-speech-text'
import {
  KOREAN_CLOCK_END_PATTERN_SOURCE,
  KOREAN_CLOCK_RANGE_SEPARATOR_PATTERN_SOURCE,
  KOREAN_CLOCK_SUFFIX_PATTERN_SOURCE,
  KOREAN_CLOCK_TOKEN_START_PATTERN_SOURCE,
  KOREAN_DIGIT_PATTERN_SOURCE,
  UNSIGNED_INTEGER_PATTERN_SOURCE,
} from './number-patterns'
import {parseClockTime} from './parse-clock-time'

const RANGE_SEPARATOR_SOURCE = '(?:~|–|—|에서|부터|내지|to|through)'
const CLOCK_EDGE_LENGTH = 3
const CLOCK_COMPONENT_LENGTH = 2
const MAX_DAY_PERIOD_HOUR = 12
const CLOCK_OPENING_SOURCE = `(?:[\\p{Ps}\\p{Pi}"']\\s*)*`
const CLOCK_RANGE_DECORATION_SOURCE = [
  CLOCK_OPENING_SOURCE,
  '(?:(?:오전|오후)[:：]?\\s*)?',
  CLOCK_OPENING_SOURCE,
].join('')
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
  `${KOREAN_CLOCK_TOKEN_START_PATTERN_SOURCE}(${CLOCK_RANGE_DECORATION_SOURCE})` +
    `(${KOREAN_DIGIT_PATTERN_SOURCE}+)[:：](${KOREAN_DIGIT_PATTERN_SOURCE}+)` +
    `\\s*${KOREAN_CLOCK_RANGE_SEPARATOR_PATTERN_SOURCE}\\s*` +
    `(${CLOCK_RANGE_DECORATION_SOURCE})` +
    `(${KOREAN_DIGIT_PATTERN_SOURCE}+)[:：](${KOREAN_DIGIT_PATTERN_SOURCE}+)` +
    `(?=${KOREAN_CLOCK_SUFFIX_PATTERN_SOURCE}|${KOREAN_CLOCK_END_PATTERN_SOURCE})`,
  'giu',
)

interface ProtectedSpan {
  readonly start: number
  readonly end: number
}

const hasValidClockEndpoint = (prefix: string, hour: string, minute: string): boolean => {
  const clock = parseClockTime(hour, minute)
  return (
    hour.length === CLOCK_COMPONENT_LENGTH &&
    minute.length === CLOCK_COMPONENT_LENGTH &&
    clock !== null &&
    (!/(?:오전|오후)/u.test(prefix) || (clock.hour >= 1 && clock.hour <= MAX_DAY_PERIOD_HOUR))
  )
}

const hasValidClockRange = (match: RegExpExecArray): boolean =>
  hasValidClockEndpoint(match[1]!, match[2]!, match[3]!) &&
  hasValidClockEndpoint(match[4]!, match[5]!, match[6]!)

const getProtectedSpans = (matches: readonly RegExpExecArray[]): ProtectedSpan[] =>
  matches
    .map((match) => ({end: match.index + match[0].length, start: match.index}))
    .sort((left, right) => left.start - right.start || right.end - left.end)
    .reduce<ProtectedSpan[]>((spans, span) => {
      const previous = spans.at(-1)
      return previous === undefined || previous.end < span.start
        ? [...spans, span]
        : [...spans.slice(0, -1), {end: Math.max(previous.end, span.end), start: previous.start}]
    }, [])

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

const getClockContextPrefix = (prefix: string): string => {
  const lastURL = Array.from(prefix.matchAll(new RegExp(PROTECTED_URL_SOURCE, 'giu'))).at(-1)
  if (lastURL === undefined) {
    return prefix
  }

  const query = /[?&][^?&#=\s]+=(?:오전|오후)?$/u.exec(lastURL[0])?.[0] ?? ''
  return `${query}${prefix.slice(lastURL.index + lastURL[0].length)}`
}

/** Produces deterministic model input while preserving ambiguous and unsupported number forms. */
export const normalizeSpeechText = (options: NormalizeSpeechTextOptions): string => {
  const normalize = getNormalizer(options.language)

  if (normalize === null) {
    return options.text
  }

  const allClockRanges =
    options.language === 'ko' ? Array.from(options.text.matchAll(COLON_CLOCK_RANGE_PATTERN)) : []
  const clockRanges = allClockRanges.filter(hasValidClockRange)
  const protectedNumbers = Array.from(options.text.matchAll(PROTECTED_NUMBER_PATTERN)).filter(
    (match) =>
      !clockRanges.some(
        (clock) =>
          clock.index + clock[1]!.length + CLOCK_EDGE_LENGTH === match.index &&
          clock.index + clock[0].length - CLOCK_EDGE_LENGTH === match.index + match[0].length,
      ),
  )
  const protectedSpans = getProtectedSpans([
    ...protectedNumbers,
    ...allClockRanges.filter((match) => !hasValidClockRange(match)),
  ])

  let result = ''
  let position = 0

  for (const span of protectedSpans) {
    result += normalize(
      options.text.slice(position, span.start),
      getClockContextPrefix(options.text.slice(0, position)),
    )
    result += options.text.slice(span.start, span.end)
    position = span.end
  }

  const normalized =
    result +
    normalize(options.text.slice(position), getClockContextPrefix(options.text.slice(0, position)))
  return Array.from(normalized).length <= (options.maximumLength ?? Infinity)
    ? normalized
    : options.text
}
