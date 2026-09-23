import type {SupertonicLanguage} from '../language'
import {classifyTinySpeechNumber} from './classify-tiny-speech-number'
import {KOREAN_PARTICLE_PATTERN_SOURCE, KOREAN_UNIT_END_PATTERN_SOURCE} from './number-patterns'
import type {ClassifySpeechNumberOptions, SpeechNumberDecision} from './types'

interface NumberContext {
  readonly prefix: string
  readonly suffix: string
  readonly value: string
}

const PRESERVE_DECISION: SpeechNumberDecision = {confidence: 1, kind: 'preserve'}
const AMBIGUOUS_DECISION: SpeechNumberDecision = {confidence: 0.5, kind: 'preserve'}
const COUNT_DECISION: SpeechNumberDecision = {confidence: 0.99, kind: 'count'}
const CARDINAL_DECISION: SpeechNumberDecision = {confidence: 0.99, kind: 'cardinal'}
const YEAR_DECISION: SpeechNumberDecision = {confidence: 0.99, kind: 'year-date-time'}
const ORDINAL_DECISION: SpeechNumberDecision = {confidence: 0.99, kind: 'ordinal'}
const DIGITS_DECISION: SpeechNumberDecision = {confidence: 0.99, kind: 'digits'}
const IDENTIFIER_DECISION: SpeechNumberDecision = {confidence: 0.99, kind: 'identifier'}
const SECOND_TO_LAST_INDEX = -2
const NUMBER_PATTERN = /^[+-]?\d[\d,.]*(?:st|nd|rd|th)?$/iu
const STRUCTURED_SEPARATOR_PATTERN = /[/:~–—-]/u
const ENGLISH_IDENTIFIER_PATTERN =
  /(?:^|[^A-Za-z])(?:channel|episode|formula|gpt|highway|id|iphone|iso|model|room|route|version)\s+$/iu
const ENGLISH_DIGIT_CUE_PATTERN =
  /(?:^|[^A-Za-z])(?:(?:access|verification)\s+)?(?:code|extension|passcode|pin)\s*$/iu
const ENGLISH_YEAR_PATTERN = /(?:^|[^A-Za-z])(?:by|during|in|since|through|until|year)\s+$/iu
const ENGLISH_MONTHS =
  'April|August|December|February|January|July|June|March|May|November|October|September'
const ENGLISH_MONTH_PATTERN = new RegExp(
  `(?:^|[^A-Za-z])(?:${ENGLISH_MONTHS})\\s+\\d{1,2},\\s+$`,
  'iu',
)
const ENGLISH_YEAR_SUFFIX_PATTERN =
  /^\s+(?:(?:AD|BC|BCE|CE)\b|(?:is|was|will)\b[^.!?]{0,64}\byear\b)/iu
const ENGLISH_COUNT_NOUN_PATTERN =
  /^\s+(?:[a-z]+s|children|feet|men|mice|people|teeth|women)(?![A-Za-z])/u
const ENGLISH_QUANTITY_CUES =
  'are|contain|contains|exactly|got|had|has|have|include|includes|' +
  'need|needed|needs|over|under|with'
const ENGLISH_QUANTITY_CUE_PATTERN = new RegExp(
  `(?:^|[^A-Za-z])(?:${ENGLISH_QUANTITY_CUES})\\s+$`,
  'iu',
)
const KOREAN_COUNT_PATTERN = new RegExp(
  `^\\s*(?:시간|개|명|마리|살|잔|점|곡)${KOREAN_UNIT_END_PATTERN_SOURCE}`,
  'u',
)
const KOREAN_MARKED_COUNT_PATTERN =
  /^\s*(?:권|대|장)(?:에서|에게|으로|부터|까지|마다|짜리|은|는|이|가|을|를|의|와|과|도|만|에|로|씩|쯤|뿐|이나|나|인|이고|이며|이라|라고)/u
const KOREAN_BARE_AMBIGUOUS_COUNTER_PATTERN = /^\s*(?:권|대|장)(?=\s*(?:[,.;!?]|$))/u
const KOREAN_YEAR_PATTERN = new RegExp(
  `^\\s*(?:년대|년생|년형|년|시)${KOREAN_UNIT_END_PATTERN_SOURCE}`,
  'u',
)
const KOREAN_CARDINAL_PATTERN = new RegExp(
  `^\\s*(?:개월|초|층|월|일|원|%)${KOREAN_UNIT_END_PATTERN_SOURCE}`,
  'u',
)
const KOREAN_BARE_PARTICLE_PATTERN = new RegExp(`^\\s*${KOREAN_PARTICLE_PATTERN_SOURCE}`, 'u')
const KOREAN_DIGIT_CUE_PATTERN =
  /(?:보안\s*)?(?:인증\s*)?(?:코드|번호|비밀번호)(?:은|는|이|가)?\s*$/u

const getContext = (options: ClassifySpeechNumberOptions): NumberContext | null => {
  if (options.start < 0 || options.end <= options.start || options.end > options.text.length) {
    return null
  }

  const value = options.text.slice(options.start, options.end)
  return NUMBER_PATTERN.test(value)
    ? {
        prefix: options.text.slice(0, options.start),
        suffix: options.text.slice(options.end),
        value,
      }
    : null
}

const hasLeadingZero = (value: string) => /^[+-]?0\d/u.test(value.replaceAll(',', ''))

const hasStructuredNeighbor = (context: NumberContext) => {
  const previousCharacter = context.prefix.at(-1)
  const nextCharacter = context.suffix.at(0)
  const hasStructuredPeriod =
    (previousCharacter === '.' &&
      /[\p{L}\p{N}]/u.test(context.prefix.at(SECOND_TO_LAST_INDEX) ?? '')) ||
    (nextCharacter === '.' && /[\p{L}\p{N}]/u.test(context.suffix.at(1) ?? ''))

  return (
    hasStructuredPeriod ||
    (previousCharacter !== undefined && STRUCTURED_SEPARATOR_PATTERN.test(previousCharacter)) ||
    (nextCharacter !== undefined && STRUCTURED_SEPARATOR_PATTERN.test(nextCharacter))
  )
}

const hasEnglishQuantityContext = (prefix: string) => {
  if (prefix.length === 0) {
    return true
  }

  const previousCharacter = prefix.trimEnd().at(-1)
  return previousCharacter !== undefined && /[,(:;]/u.test(previousCharacter)
    ? true
    : ENGLISH_QUANTITY_CUE_PATTERN.test(prefix)
}

const hasValidOrdinalSuffix = (value: string) => {
  const match = /^(?<number>\d{1,3}(?:,\d{3})+|\d+)(?<suffix>st|nd|rd|th)$/iu.exec(value)

  if (match?.groups === undefined) {
    return false
  }

  const numberText = match.groups.number
  const suffixText = match.groups.suffix

  if (numberText === undefined || suffixText === undefined) {
    return false
  }

  const number = BigInt(numberText.replaceAll(',', ''))
  const suffix = suffixText.toLowerCase()
  const finalHundred = number % 100n

  if (finalHundred >= 11n && finalHundred <= 13n) {
    return suffix === 'th'
  }

  switch (number % 10n) {
    case 1n:
      return suffix === 'st'
    case 2n:
      return suffix === 'nd'
    case 3n:
      return suffix === 'rd'
    default:
      return suffix === 'th'
  }
}

const classifyMarkedKoreanCount = (prefix: string): SpeechNumberDecision =>
  /\p{L}/u.test(prefix) ? COUNT_DECISION : AMBIGUOUS_DECISION

const classifyEnglishNumber = (context: NumberContext): SpeechNumberDecision => {
  if (ENGLISH_DIGIT_CUE_PATTERN.test(context.prefix)) {
    return DIGITS_DECISION
  }

  if (hasLeadingZero(context.value)) {
    return DIGITS_DECISION
  }

  if (hasStructuredNeighbor(context)) {
    return AMBIGUOUS_DECISION
  }

  if (context.value.includes('.')) {
    return /^\s*%/u.test(context.suffix) ? CARDINAL_DECISION : AMBIGUOUS_DECISION
  }

  if (ENGLISH_IDENTIFIER_PATTERN.test(context.prefix)) {
    return IDENTIFIER_DECISION
  }

  if (hasValidOrdinalSuffix(context.value)) {
    return ORDINAL_DECISION
  }

  if (/(?:st|nd|rd|th)$/iu.test(context.value)) {
    return AMBIGUOUS_DECISION
  }

  const isFourDigitYear = /^\d{4}$/u.test(context.value)
  const hasYearContext =
    ENGLISH_YEAR_PATTERN.test(context.prefix) ||
    ENGLISH_MONTH_PATTERN.test(context.prefix) ||
    (context.prefix.trim().length === 0 && ENGLISH_YEAR_SUFFIX_PATTERN.test(context.suffix))

  if (isFourDigitYear && hasYearContext) {
    return YEAR_DECISION
  }

  if (/^\s*%/u.test(context.suffix)) {
    return CARDINAL_DECISION
  }

  const isInteger = /^\d{1,3}(?:,\d{3})*$|^\d+$/u.test(context.value)
  const isPotentialYear = /^\d{4}$/u.test(context.value)

  if (isPotentialYear && !ENGLISH_DIGIT_CUE_PATTERN.test(context.prefix)) {
    return AMBIGUOUS_DECISION
  }

  if (
    isInteger &&
    ENGLISH_COUNT_NOUN_PATTERN.test(context.suffix) &&
    hasEnglishQuantityContext(context.prefix)
  ) {
    return COUNT_DECISION
  }

  return classifyTinySpeechNumber({
    language: 'en',
    prefix: context.prefix,
    suffix: context.suffix,
  })
}

const classifyKoreanNumber = (context: NumberContext): SpeechNumberDecision => {
  if (/문서\s*번호\s*$/u.test(context.prefix)) {
    return IDENTIFIER_DECISION
  }

  if (KOREAN_DIGIT_CUE_PATTERN.test(context.prefix)) {
    return DIGITS_DECISION
  }

  if (hasLeadingZero(context.value)) {
    return DIGITS_DECISION
  }

  if (hasStructuredNeighbor(context)) {
    return AMBIGUOUS_DECISION
  }

  if (
    /(?:방|버전|모델)\s*$/u.test(context.prefix) ||
    /^\s*호(?:$|[^\p{L}\p{N}_])/u.test(context.suffix)
  ) {
    return IDENTIFIER_DECISION
  }

  if (context.value.includes('.')) {
    return /^\s*%/u.test(context.suffix) ? CARDINAL_DECISION : AMBIGUOUS_DECISION
  }

  if (KOREAN_COUNT_PATTERN.test(context.suffix)) {
    return COUNT_DECISION
  }

  if (/제\s*$/u.test(context.prefix) && /^\s*장/u.test(context.suffix)) {
    return PRESERVE_DECISION
  }

  if (KOREAN_MARKED_COUNT_PATTERN.test(context.suffix)) {
    return classifyMarkedKoreanCount(context.prefix)
  }

  if (KOREAN_BARE_AMBIGUOUS_COUNTER_PATTERN.test(context.suffix)) {
    return PRESERVE_DECISION
  }

  if (KOREAN_YEAR_PATTERN.test(context.suffix)) {
    return YEAR_DECISION
  }

  if (/^\s*분(?=\s*(?:남|후|동안|전|간))/u.test(context.suffix)) {
    return CARDINAL_DECISION
  }

  if (/^\s*분(?:$|[^\p{L}\p{N}_])/u.test(context.suffix)) {
    return AMBIGUOUS_DECISION
  }

  if (
    KOREAN_BARE_PARTICLE_PATTERN.test(context.suffix) &&
    !KOREAN_DIGIT_CUE_PATTERN.test(context.prefix)
  ) {
    return AMBIGUOUS_DECISION
  }

  return KOREAN_CARDINAL_PATTERN.test(context.suffix)
    ? CARDINAL_DECISION
    : classifyTinySpeechNumber({
        language: 'ko',
        prefix: context.prefix,
        suffix: context.suffix,
      })
}

/** Classifies a numeric span without changing the caller-owned text. */
export const classifySpeechNumber = (
  options: ClassifySpeechNumberOptions,
): SpeechNumberDecision => {
  const context = getContext(options)

  if (context === null) {
    return PRESERVE_DECISION
  }

  if (options.language === 'en') {
    return classifyEnglishNumber(context)
  }

  return options.language === 'ko' ? classifyKoreanNumber(context) : PRESERVE_DECISION
}
