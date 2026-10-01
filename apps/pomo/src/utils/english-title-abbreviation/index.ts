export const ENGLISH_TITLE_ABBREVIATIONS = [
  'Dr',
  'Mr',
  'Mrs',
  'Ms',
  'Prof',
  'Rev',
  'Hon',
  'Gov',
  'Pres',
  'Sen',
  'Rep',
  'Gen',
  'Lt',
  'Col',
  'Capt',
  'Sgt',
  'St',
  'Mt',
  'Jr',
  'Sr',
  'vs',
] as const

const TITLE_ABBREVIATION_PATTERN = new RegExp(
  `^(?:${ENGLISH_TITLE_ABBREVIATIONS.join('|')})\\.$`,
  'iu',
)
export const isEnglishTitleAbbreviation = (value: string): boolean =>
  TITLE_ABBREVIATION_PATTERN.test(value)
