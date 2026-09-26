import {hasNumberKind} from './has-number-kind'
import {parseInteger} from './parse-integer'
import {DECIMAL_PERCENT_PATTERN, INTEGER_PERCENT_PATTERN} from './percent-patterns'
import {
  INTEGER_PATTERN_SOURCE,
  NUMBER_TOKEN_START_PATTERN_SOURCE,
  UNSIGNED_INTEGER_PATTERN_SOURCE,
} from './number-patterns'

const SMALL_CARDINALS = [
  'zero',
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
  'twelve',
  'thirteen',
  'fourteen',
  'fifteen',
  'sixteen',
  'seventeen',
  'eighteen',
  'nineteen',
] as const
const DECIMAL_RADIX = 10
const HUNDRED = 100
const TENS_CARDINALS = [
  '',
  '',
  'twenty',
  'thirty',
  'forty',
  'fifty',
  'sixty',
  'seventy',
  'eighty',
  'ninety',
] as const
const SMALL_ORDINALS = [
  'zeroth',
  'first',
  'second',
  'third',
  'fourth',
  'fifth',
  'sixth',
  'seventh',
  'eighth',
  'ninth',
  'tenth',
  'eleventh',
  'twelfth',
  'thirteenth',
  'fourteenth',
  'fifteenth',
  'sixteenth',
  'seventeenth',
  'eighteenth',
  'nineteenth',
] as const
const TENS_ORDINALS = [
  '',
  '',
  'twentieth',
  'thirtieth',
  'fortieth',
  'fiftieth',
  'sixtieth',
  'seventieth',
  'eightieth',
  'ninetieth',
] as const
const SCALES = [
  {size: 1_000_000_000_000n, word: 'trillion'},
  {size: 1_000_000_000n, word: 'billion'},
  {size: 1_000_000n, word: 'million'},
  {size: 1_000n, word: 'thousand'},
] as const
const MAXIMUM_SUPPORTED_INTEGER = 999_999_999_999_999n
const ORDINAL_PATTERN = new RegExp(
  `${NUMBER_TOKEN_START_PATTERN_SOURCE}(${UNSIGNED_INTEGER_PATTERN_SOURCE})(st|nd|rd|th)(?![A-Za-z])`,
  'gu',
)
const YEAR_PATTERN = new RegExp(
  `${NUMBER_TOKEN_START_PATTERN_SOURCE}(\\d{4})(?![\\p{L}\\p{N}_/:+\\-]|\\.[\\p{L}\\p{N}])`,
  'gu',
)
const FIRST_SUPPORTED_YEAR = 1000n
const LAST_SUPPORTED_YEAR = 9999n
const COUNT_NOUNS = '(?:[a-z]+s|people|children|men|women|feet|teeth|mice)'
const COUNT_PATTERN = new RegExp(
  `${NUMBER_TOKEN_START_PATTERN_SOURCE}(${UNSIGNED_INTEGER_PATTERN_SOURCE})(?=\\s+${COUNT_NOUNS}(?![A-Za-z]))`,
  'gu',
)
const DIGIT_CODE_PATTERN = new RegExp(
  `\\b((?:(?:access|verification)\\s+)?(?:code|extension|passcode|pin)\\s+)` +
    `(${UNSIGNED_INTEGER_PATTERN_SOURCE})(?![\\p{L}\\p{N}_.,+\\-/:~–—])`,
  'giu',
)
const pronounceUnderThousand = (value: number): string => {
  if (value < SMALL_CARDINALS.length) {
    return SMALL_CARDINALS[value]!
  }

  if (value < HUNDRED) {
    const tens = Math.floor(value / DECIMAL_RADIX)
    const ones = value % DECIMAL_RADIX
    return ones === 0 ? TENS_CARDINALS[tens]! : `${TENS_CARDINALS[tens]}-${SMALL_CARDINALS[ones]}`
  }

  const hundreds = Math.floor(value / HUNDRED)
  const remainder = value % HUNDRED
  const prefix = `${SMALL_CARDINALS[hundreds]} hundred`
  return remainder === 0 ? prefix : `${prefix} ${pronounceUnderThousand(remainder)}`
}

const pronouncePositiveInteger = (value: bigint): string | null => {
  if (value < 1_000n) {
    return pronounceUnderThousand(Number(value))
  }

  for (const scale of SCALES) {
    if (value >= scale.size) {
      const quotient = value / scale.size
      const remainder = value % scale.size
      const quotientWords = pronouncePositiveInteger(quotient)
      const remainderWords = remainder === 0n ? '' : pronouncePositiveInteger(remainder)

      if (quotientWords === null || remainderWords === null) {
        return null
      }

      return remainderWords.length === 0
        ? `${quotientWords} ${scale.word}`
        : `${quotientWords} ${scale.word} ${remainderWords}`
    }
  }

  return null
}

const pronounceCardinal = (value: string): string | null => {
  const parsed = parseInteger(value)

  if (
    parsed === null ||
    parsed > MAXIMUM_SUPPORTED_INTEGER ||
    parsed < -MAXIMUM_SUPPORTED_INTEGER
  ) {
    return null
  }

  const isNegative = value.startsWith('-')
  const isPositive = value.startsWith('+')
  const words = pronouncePositiveInteger(parsed < 0n ? -parsed : parsed)
  const sign = isNegative ? 'minus ' : isPositive ? 'plus ' : ''
  return words === null ? null : `${sign}${words}`
}

const pronounceOrdinal = (value: string): string | null => {
  const parsed = parseInteger(value)

  if (parsed === null || parsed < 0n) {
    return null
  }

  if (parsed < BigInt(SMALL_ORDINALS.length)) {
    return SMALL_ORDINALS[Number(parsed)]!
  }

  if (parsed < 100n) {
    const tens = Number(parsed / 10n)
    const ones = Number(parsed % 10n)
    return ones === 0 ? TENS_ORDINALS[tens]! : `${TENS_CARDINALS[tens]}-${SMALL_ORDINALS[ones]}`
  }

  const cardinal = pronounceCardinal(value)
  if (cardinal === null) {
    return null
  }

  const ordinalEndings = [
    ['twelve', 'twelfth'],
    ['one', 'first'],
    ['two', 'second'],
    ['three', 'third'],
    ['five', 'fifth'],
    ['eight', 'eighth'],
    ['nine', 'ninth'],
    ['y', 'ieth'],
  ] as const
  const ending = ordinalEndings.find(([suffix]) => cardinal.endsWith(suffix))

  return ending === undefined
    ? `${cardinal}th`
    : `${cardinal.slice(0, -ending[0].length)}${ending[1]}`
}

const pronounceDecimal = (value: string): string | null => {
  const decimalIndex = value.indexOf('.')
  const integer = pronounceCardinal(value.slice(0, decimalIndex))

  if (integer === null) {
    return null
  }

  const fraction = Array.from(
    value.slice(decimalIndex + 1),
    (digit) => SMALL_CARDINALS[Number(digit)],
  )
  return fraction.some((word) => word === undefined)
    ? null
    : `${integer} point ${fraction.join(' ')}`
}

const pronounceDigits = (value: string) =>
  Array.from(value.replaceAll(',', ''), (digit) => SMALL_CARDINALS[Number(digit)]).join(' ')

const pronounceYear = (value: string): string | null => {
  const parsed = parseInteger(value)

  if (parsed === null || parsed < FIRST_SUPPORTED_YEAR || parsed > LAST_SUPPORTED_YEAR) {
    return null
  }

  if (parsed >= 2000n && parsed <= 2009n) {
    return pronounceCardinal(value)
  }

  const century = pronounceCardinal(String(parsed / 100n))
  const remainder = parsed % 100n

  if (century === null) {
    return null
  }

  if (remainder === 0n) {
    if (parsed % 1000n !== 0n) {
      return `${century} hundred`
    }

    const millennium = pronounceCardinal(String(parsed / 1000n))
    return millennium === null ? null : `${millennium} thousand`
  }

  const ending = pronounceCardinal(String(remainder))

  if (ending === null) {
    return null
  }

  return remainder < 10n ? `${century} oh ${ending}` : `${century} ${ending}`
}

/** Converts only English number forms whose pronunciation is established by their syntax. */
export const normalizeEnglishSpeechText = (text: string): string =>
  text
    .replace(
      DIGIT_CODE_PATTERN,
      (...[match, prefix, value, start, input]: [string, string, string, number, string]) => {
        const valueStart = start + prefix.length
        return hasNumberKind('en', input, valueStart, value, 'digits')
          ? `${prefix}${pronounceDigits(value)}`
          : match
      },
    )
    .replace(DECIMAL_PERCENT_PATTERN, (match, value: string, start: number, input: string) => {
      if (!hasNumberKind('en', input, start, value, 'cardinal')) {
        return match
      }

      const pronunciation = pronounceDecimal(value)
      return pronunciation === null ? match : `${pronunciation} percent`
    })
    .replace(INTEGER_PERCENT_PATTERN, (match, value: string, start: number, input: string) => {
      if (!hasNumberKind('en', input, start, value, 'cardinal')) {
        return match
      }

      const pronunciation = pronounceCardinal(value)
      return pronunciation === null ? match : `${pronunciation} percent`
    })
    .replace(YEAR_PATTERN, (match, value: string, start: number, input: string) =>
      hasNumberKind('en', input, start, value, 'year-date-time')
        ? (pronounceYear(value) ?? match)
        : match,
    )
    .replace(
      ORDINAL_PATTERN,
      (...[match, value, , start, input]: [string, string, string, number, string]) =>
        hasNumberKind('en', input, start, match, 'ordinal')
          ? (pronounceOrdinal(value) ?? match)
          : match,
    )
    .replace(COUNT_PATTERN, (match, value: string, start: number, input: string) =>
      hasNumberKind('en', input, start, value, 'count')
        ? (pronounceCardinal(value) ?? match)
        : match,
    )
