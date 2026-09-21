export const INTEGER_PATTERN_SOURCE = '[+-]?(?:\\d{1,3}(?:,\\d{3})+|\\d+)'
export const UNSIGNED_INTEGER_PATTERN_SOURCE = '(?:\\d{1,3}(?:,\\d{3})+|\\d+)'
export const NUMBER_TOKEN_START_PATTERN_SOURCE = '(?<![\\p{L}\\p{N}_.,+\\-/:~–—#@$€£¥₩<>≤≥≈])'
export const KOREAN_PARTICLE_PATTERN_SOURCE =
  '(?:에서|에게|으로|부터|까지|마다|짜리|예요|입니다|이었다|였어요|' +
  '은|는|이|가|을|를|의|와|과|도|만|에|로|씩|쯤|뿐|이나|나|인|이고|이며|' +
  '이라|라고|처럼|보다|간)(?=$|[^\\p{L}\\p{N}_])'
export const KOREAN_UNIT_END_PATTERN_SOURCE = `(?=$|[^\\p{L}\\p{N}_]|${KOREAN_PARTICLE_PATTERN_SOURCE})`
