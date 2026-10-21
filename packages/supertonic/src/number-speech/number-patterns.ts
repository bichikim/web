/** 영어 수량 명사의 정규식 부분식. 공백·단어 경계·플래그는 각 사용처에서 조합한다. */
export const ENGLISH_COUNT_NOUNS = '(?:[a-z]+s|children|feet|men|mice|people|teeth|women)'

export const NUMBER_SIGN_CHARACTERS = '+\\-−－＋'
export const NUMBER_SIGN_PATTERN_SOURCE = `[${NUMBER_SIGN_CHARACTERS}]`
const ASCII_DIGIT_PATTERN_SOURCE = '\\d'
export const KOREAN_DIGIT_PATTERN_SOURCE = '[\\d０-９]'

const createIntegerPatternSource = (digitPatternSource: string) =>
  `(?:${digitPatternSource}{1,3}(?:,${digitPatternSource}{3})+|${digitPatternSource}+)`

const createSignedIntegerPatternSource = (digits: string) =>
  `${NUMBER_SIGN_PATTERN_SOURCE}?${createIntegerPatternSource(digits)}`
export const INTEGER_PATTERN_SOURCE = createSignedIntegerPatternSource(ASCII_DIGIT_PATTERN_SOURCE)
export const UNSIGNED_INTEGER_PATTERN_SOURCE = createIntegerPatternSource(
  ASCII_DIGIT_PATTERN_SOURCE,
)
export const KOREAN_INTEGER_PATTERN_SOURCE = createSignedIntegerPatternSource(
  KOREAN_DIGIT_PATTERN_SOURCE,
)
export const KOREAN_UNSIGNED_INTEGER_PATTERN_SOURCE = createIntegerPatternSource(
  KOREAN_DIGIT_PATTERN_SOURCE,
)
export const NUMBER_TOKEN_START_PATTERN_SOURCE = `(?<![\\p{L}\\p{N}_.,${NUMBER_SIGN_CHARACTERS}/:~–—#@$€£¥₩<>≤≥≈])`
export const KOREAN_PARTICLE_PATTERN_SOURCE =
  '(?:에서|에게|으로|부터|까지|마다|짜리|예요|입니다|이었다|였어요|' +
  '은|는|이|가|을|를|의|와|과|도|만|에|로|씩|쯤|뿐|이나|나|인|이고|이며|' +
  '이라|라고|처럼|보다|간)(?=$|[^\\p{L}\\p{N}_])'
export const KOREAN_UNIT_END_PATTERN_SOURCE = `(?=$|[^\\p{L}\\p{N}_]|${KOREAN_PARTICLE_PATTERN_SOURCE})`

const CLOCK_LABEL_START_SOURCE = '(?<=(?:시각|현재\\s*시간):)'
export const KOREAN_CLOCK_TOKEN_START_PATTERN_SOURCE = [
  `(?:${NUMBER_TOKEN_START_PATTERN_SOURCE}|`,
  `${CLOCK_LABEL_START_SOURCE})(?<![?&=%\\\\])`,
].join('')
const KOREAN_CLOCK_CLOSING_DELIMITERS_PATTERN_SOURCE = `(?:[\\p{Pe}\\p{Pf}"']\\s*)*`
export const KOREAN_CLOCK_SUFFIX_PATTERN_SOURCE =
  `\\s*${KOREAN_CLOCK_CLOSING_DELIMITERS_PATTERN_SOURCE}(?:${KOREAN_PARTICLE_PATTERN_SOURCE}|` +
  `(?:에서|부터|까지|에|쯤|경)${KOREAN_PARTICLE_PATTERN_SOURCE}|경(?=$|[^\\p{L}\\p{N}_]))`
export const KOREAN_CLOCK_RANGE_SEPARATOR_PATTERN_SOURCE =
  `${KOREAN_CLOCK_CLOSING_DELIMITERS_PATTERN_SOURCE}(?:에서|부터)` +
  `(?:${KOREAN_PARTICLE_PATTERN_SOURCE})?`

export const KOREAN_CLOCK_END_PATTERN_SOURCE = `(?=$|[,.!?…](?=$|[\\s\\p{Pe}\\p{Pf}"'])|[\\s\\p{Pe}\\p{Pf}"'])`
