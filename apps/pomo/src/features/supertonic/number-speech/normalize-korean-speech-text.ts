import {classifySpeechNumber} from './classify-speech-number'
import {hasNumberKind} from './has-number-kind'
import {parseInteger} from './parse-integer'
import {parseClockTime} from './parse-clock-time'
import {KOREAN_DECIMAL_PERCENT_PATTERN, KOREAN_INTEGER_PERCENT_PATTERN} from './percent-patterns'
import {
  KOREAN_DIGIT_PATTERN_SOURCE,
  KOREAN_INTEGER_PATTERN_SOURCE,
  KOREAN_PARTICLE_PATTERN_SOURCE,
  KOREAN_UNIT_END_PATTERN_SOURCE,
  KOREAN_UNSIGNED_INTEGER_PATTERN_SOURCE,
  NUMBER_TOKEN_START_PATTERN_SOURCE,
} from './number-patterns'

const DIGIT_WORDS = ['영', '일', '이', '삼', '사', '오', '육', '칠', '팔', '구'] as const
const DECIMAL_RADIX = 10
const MAX_TWELVE_HOUR_CLOCK_HOUR = 12
const NATIVE_LIMIT = 100n
const SPECIAL_TWENTY = 20
const SMALL_UNITS = ['', '십', '백', '천'] as const
const LARGE_UNITS = ['', '만', '억', '조', '경'] as const
const NATIVE_COUNTER_ONES = [
  '',
  '한',
  '두',
  '세',
  '네',
  '다섯',
  '여섯',
  '일곱',
  '여덟',
  '아홉',
] as const
const NATIVE_TENS = [
  '',
  '열',
  '스물',
  '서른',
  '마흔',
  '쉰',
  '예순',
  '일흔',
  '여든',
  '아흔',
] as const
const NATIVE_COUNTERS = '시간|개|명|마리|살|잔|권|대|장|점|곡'
const SINO_UNITS = '개월|년대|년생|년형|년|초|층|월|일|도'
const TOKEN_START_PATTERN = NUMBER_TOKEN_START_PATTERN_SOURCE
const UNSIGNED_MONTH_NUMBER_PATTERN = /^[\d０-９]+$/u
const UNSIGNED_INTEGER_PATTERN = KOREAN_UNSIGNED_INTEGER_PATTERN_SOURCE
const KOREAN_PARTICLE_PATTERN = KOREAN_PARTICLE_PATTERN_SOURCE
const KOREAN_UNIT_END_PATTERN = KOREAN_UNIT_END_PATTERN_SOURCE
const LEVEL_FOLLOWING_PATTERN = `[\\p{L}\\p{N}_]|[.,]${KOREAN_DIGIT_PATTERN_SOURCE}|[+\\-/:~–—#@$€£¥₩<>≤≥≈]`
const LEVEL_NUMBER_END = `(?:(?=${KOREAN_PARTICLE_PATTERN})|(?!${LEVEL_FOLLOWING_PATTERN})${KOREAN_UNIT_END_PATTERN})`
const SIGNED_NUMBER_PREFIX_PATTERN = /[+＋−－-]\s*$/u
const TIME_OF_DAY_PREFIX_PATTERN = /(?:오전|오후)\s*$/u
const REMAINING_DURATION_SUFFIX_SOURCE =
  '남(?:$|[^\\p{L}\\p{N}_]|았|아|은|는|을|음|지|습니다|는다|으면)'
const REMAINING_DURATION_SUFFIX_PATTERN = new RegExp(
  `^\\s*${REMAINING_DURATION_SUFFIX_SOURCE}`,
  'u',
)
const WON_PATTERN = new RegExp(
  `${TOKEN_START_PATTERN}(${KOREAN_INTEGER_PATTERN_SOURCE})\\s*원${KOREAN_UNIT_END_PATTERN}`,
  'gu',
)
const DURATION_MINUTE_PATTERN = new RegExp(
  `${TOKEN_START_PATTERN}(${UNSIGNED_INTEGER_PATTERN})\\s*분` +
    `(?=\\s*(?:${REMAINING_DURATION_SUFFIX_SOURCE}|후|동안|전(?:에|부터|\\s|$)|간(?:\\s|$)))`,
  'gu',
)
const CLOCK_TIME_PATTERN = new RegExp(
  `${TOKEN_START_PATTERN}(${UNSIGNED_INTEGER_PATTERN})\\s*시\\s*` +
    `(${UNSIGNED_INTEGER_PATTERN})\\s*분${KOREAN_UNIT_END_PATTERN}`,
  'gu',
)
const CLOCK_MINUTE_PREFIX_PATTERN = new RegExp(`(?:${UNSIGNED_INTEGER_PATTERN})\\s*시\\s*$`, 'u')
const NATIVE_COUNTER_PATTERN = new RegExp(
  `${TOKEN_START_PATTERN}(${UNSIGNED_INTEGER_PATTERN})\\s*` +
    `(${NATIVE_COUNTERS})${KOREAN_UNIT_END_PATTERN}`,
  'gu',
)
const CLOCK_HOUR_PATTERN = new RegExp(
  `${TOKEN_START_PATTERN}(${UNSIGNED_INTEGER_PATTERN})\\s*시` +
    `(?!\\s*${UNSIGNED_INTEGER_PATTERN}\\s*분)${KOREAN_UNIT_END_PATTERN}`,
  'gu',
)
const SINO_UNIT_PATTERN = new RegExp(
  `${TOKEN_START_PATTERN}(${KOREAN_INTEGER_PATTERN_SOURCE})\\s*` +
    `(${SINO_UNITS})${KOREAN_UNIT_END_PATTERN}`,
  'gu',
)
const DIGIT_CODE_PATTERN = new RegExp(
  `((?:(?:보안|인증)\\s*)?(?:코드|번호|비밀번호)(?:은|는|이|가)?\\s*)` +
    `(${UNSIGNED_INTEGER_PATTERN})${KOREAN_UNIT_END_PATTERN}`,
  'gu',
)
const LEVEL_PREFIX_PATTERN = new RegExp(
  `(레벨\\s+)(${UNSIGNED_INTEGER_PATTERN})${LEVEL_NUMBER_END}`,
  'gu',
)
const LEVEL_SUFFIX_PATTERN = new RegExp(
  `${TOKEN_START_PATTERN}(${UNSIGNED_INTEGER_PATTERN})\\s*(렙)${KOREAN_UNIT_END_PATTERN}`,
  'gu',
)

const pronounceSection = (section: number) => {
  const words: Array<string> = []
  let remaining = section

  for (let position = SMALL_UNITS.length - 1; position >= 0; position -= 1) {
    const divisor = DECIMAL_RADIX ** position
    const digit = Math.floor(remaining / divisor)
    remaining %= divisor

    if (digit > 0) {
      if (digit > 1 || position === 0) {
        words.push(DIGIT_WORDS[digit]!)
      }
      words.push(SMALL_UNITS[position]!)
    }
  }

  return words.join('')
}

const pronounceSinoInteger = (value: string): string | null => {
  const parsed = parseInteger(value)

  if (parsed === null) {
    return null
  }

  const isNegative = value.startsWith('-') || value.startsWith('−')
  const isPositive = value.startsWith('+')
  let remaining = parsed < 0n ? -parsed : parsed

  if (remaining === 0n) {
    const sign = isNegative ? '마이너스 ' : isPositive ? '플러스 ' : ''
    return `${sign}${DIGIT_WORDS[0]}`
  }

  const sections: Array<string> = []
  let position = 0

  while (remaining > 0n && position < LARGE_UNITS.length) {
    const section = Number(remaining % 10_000n)
    remaining /= 10_000n

    if (section > 0) {
      const isSingleHighestTenThousand = section === 1 && position === 1 && remaining === 0n
      const sectionWord = isSingleHighestTenThousand ? '' : pronounceSection(section)
      sections.unshift(`${sectionWord}${LARGE_UNITS[position]}`)
    }
    position += 1
  }

  if (remaining > 0n) {
    return null
  }

  const sign = isNegative ? '마이너스 ' : isPositive ? '플러스 ' : ''
  return `${sign}${sections.join(' ')}`
}

const pronounceNativeCounter = (value: string): string | null => {
  const parsed = parseInteger(value)

  if (parsed === null || parsed < 0n) {
    return null
  }

  if (parsed === 0n || parsed >= NATIVE_LIMIT) {
    return pronounceSinoInteger(value)
  }

  const number = Number(parsed)
  const tens = Math.floor(number / DECIMAL_RADIX)
  const ones = number % DECIMAL_RADIX

  if (number === SPECIAL_TWENTY) {
    return '스무'
  }

  return `${NATIVE_TENS[tens]}${NATIVE_COUNTER_ONES[ones]}`
}

const pronounceClockHour = (value: string) => {
  const parsed = parseInteger(value)
  return parsed !== null && parsed >= 1n && parsed <= 12n
    ? pronounceNativeCounter(value)
    : pronounceSinoInteger(value)
}

const pronounceDecimal = (value: string): string | null => {
  const decimalIndex = value.indexOf('.')
  const integer = pronounceSinoInteger(value.slice(0, decimalIndex))

  if (integer === null) {
    return null
  }

  const fraction = Array.from(
    value.slice(decimalIndex + 1),
    (digit) => DIGIT_WORDS[Number(digit.normalize('NFKC'))],
  )

  return fraction.some((word) => word === undefined) ? null : `${integer} 점 ${fraction.join(' ')}`
}

const pronounceDigits = (value: string) =>
  Array.from(
    value.replaceAll(',', ''),
    (digit) => DIGIT_WORDS[Number(digit.normalize('NFKC'))],
  ).join(' ')

const replaceWhenPronounceable = (
  match: string,
  value: string,
  unit: string,
  pronounce: (value: string) => string | null,
) => {
  const pronunciation = pronounce(value)

  if (pronunciation === null) {
    return match
  }

  const unitSeparator = unit === '월' && /^1[12]$/u.test(value.normalize('NFKC')) ? '' : ' '
  return `${pronunciation}${unitSeparator}${unit}`
}

const parseDurationMinuteValue = (value: string): string | null => {
  const integer = value.replaceAll(',', '')

  if (!/^\d+$/u.test(integer)) {
    return null
  }

  const hasLeadingZero = integer.length > 1 && integer.startsWith('0')

  if (hasLeadingZero && integer.length !== 2) {
    return null
  }

  return integer.replace(/^0(?=\d)/u, '')
}

const hasCanonicalNumberKind = ({
  input,
  start,
  value,
  canonicalValue,
  kind,
}: {
  input: string
  start: number
  value: string
  canonicalValue: string
  kind: 'cardinal' | 'year-date-time'
}) => {
  if (SIGNED_NUMBER_PREFIX_PATTERN.test(input.slice(0, start))) {
    return false
  }

  const canonicalInput = `${input.slice(0, start)}${canonicalValue}${input.slice(start + value.length)}`
  return hasNumberKind('ko', canonicalInput, start, canonicalValue, kind)
}

const hasValidClockHourInContext = (hour: number, input: string, start: number) =>
  !TIME_OF_DAY_PREFIX_PATTERN.test(input.slice(0, start)) ||
  (hour >= 1 && hour <= MAX_TWELVE_HOUR_CLOCK_HOUR)

/** Converts only Korean number forms whose pronunciation is established by their syntax. */
export const normalizeKoreanSpeechText = (text: string): string =>
  text
    .replace(LEVEL_PREFIX_PATTERN, (match, prefix: string, value: string) => {
      const pronunciation = pronounceSinoInteger(value)
      return pronunciation === null ? match : `${prefix}${pronunciation}`
    })
    .replace(LEVEL_SUFFIX_PATTERN, (match, value: string, unit: string) =>
      replaceWhenPronounceable(match, value, unit, pronounceSinoInteger),
    )
    .replace(
      DIGIT_CODE_PATTERN,
      (...[match, prefix, value, start, input]: [string, string, string, number, string]) => {
        const valueStart = start + prefix.length
        return hasNumberKind('ko', input, valueStart, value, 'digits')
          ? `${prefix}${pronounceDigits(value)}`
          : match
      },
    )
    .replace(
      KOREAN_DECIMAL_PERCENT_PATTERN,
      (match, value: string, start: number, input: string) => {
        if (!hasNumberKind('ko', input, start, value, 'cardinal')) {
          return match
        }

        const pronunciation = pronounceDecimal(value)
        return pronunciation === null ? match : `${pronunciation} 퍼센트`
      },
    )
    .replace(
      KOREAN_INTEGER_PERCENT_PATTERN,
      (match, value: string, start: number, input: string) => {
        if (!hasNumberKind('ko', input, start, value, 'cardinal')) {
          return match
        }

        const pronunciation = pronounceSinoInteger(value)
        return pronunciation === null ? match : `${pronunciation} 퍼센트`
      },
    )
    .replace(WON_PATTERN, (match, value: string, start: number, input: string) =>
      hasNumberKind('ko', input, start, value, 'cardinal')
        ? replaceWhenPronounceable(match, value, '원', pronounceSinoInteger)
        : match,
    )
    .replace(
      CLOCK_TIME_PATTERN,
      (...[match, hour, minute, start, input]: [string, string, string, number, string]) => {
        const clockTime = parseClockTime(hour, minute)
        if (clockTime === null) {
          return match
        }

        if (!hasValidClockHourInContext(clockTime.hour, input, start)) {
          return match
        }

        const canonicalHour = String(clockTime.hour)

        if (
          !hasCanonicalNumberKind({
            canonicalValue: canonicalHour,
            input,
            kind: 'year-date-time',
            start,
            value: hour,
          })
        ) {
          return match
        }

        const hourPronunciation = pronounceClockHour(canonicalHour)
        const minutePronunciation = pronounceSinoInteger(String(clockTime.minute))
        return hourPronunciation === null || minutePronunciation === null
          ? match
          : `${hourPronunciation} 시 ${minutePronunciation} 분`
      },
    )
    .replace(DURATION_MINUTE_PATTERN, (match, value: string, start: number, input: string) => {
      if (CLOCK_MINUTE_PREFIX_PATTERN.test(input.slice(0, start))) {
        return match
      }

      const hasLeadingZero = value.length > 1 && value.startsWith('0')
      const hasRemainingDurationSuffix = REMAINING_DURATION_SUFFIX_PATTERN.test(
        input.slice(start + match.length),
      )

      if (hasLeadingZero && !hasRemainingDurationSuffix) {
        return match
      }

      const durationMinutes = parseDurationMinuteValue(value)

      return durationMinutes !== null &&
        hasCanonicalNumberKind({
          canonicalValue: durationMinutes,
          input,
          kind: 'cardinal',
          start,
          value,
        })
        ? replaceWhenPronounceable(match, durationMinutes, '분', pronounceSinoInteger)
        : match
    })
    .replace(
      NATIVE_COUNTER_PATTERN,
      (...[match, value, counter, start, input]: [string, string, string, number, string]) =>
        hasNumberKind('ko', input, start, value, 'count')
          ? replaceWhenPronounceable(match, value, counter, pronounceNativeCounter)
          : match,
    )
    .replace(CLOCK_HOUR_PATTERN, (match, value: string, start: number, input: string) => {
      const clockTime = parseClockTime(value, '00')
      if (clockTime === null || !hasValidClockHourInContext(clockTime.hour, input, start)) {
        return match
      }

      const canonicalHour = String(clockTime.hour)

      return hasCanonicalNumberKind({
        canonicalValue: canonicalHour,
        input,
        kind: 'year-date-time',
        start,
        value,
      })
        ? replaceWhenPronounceable(match, canonicalHour, '시', pronounceClockHour)
        : match
    })
    .replace(
      SINO_UNIT_PATTERN,
      (...[match, value, unit, start, input]: [string, string, string, number, string]) => {
        const {kind} = classifySpeechNumber({
          end: start + value.length,
          language: 'ko',
          start,
          text: input,
        })

        if (kind !== 'cardinal' && kind !== 'year-date-time') {
          return match
        }

        if (unit === '월' && UNSIGNED_MONTH_NUMBER_PATTERN.test(value)) {
          const month = parseInteger(value)

          if (month === 6n) {
            return '유월'
          }

          if (month === 10n) {
            return '시월'
          }
        }

        return replaceWhenPronounceable(match, value, unit, pronounceSinoInteger)
      },
    )
