import type {LanguageLearningLanguage} from './schema'

export const LANGUAGE_LEARNING_SENTENCE_LIMITS = {
  en: {characters: 180, words: 30},
  ja: {characters: 90, words: null},
  ko: {characters: 90, words: null},
} as const satisfies Record<
  LanguageLearningLanguage,
  {readonly characters: number; readonly words: number | null}
>

const ENDING_PATTERN = /[.!?。！？]$/u
const INTERNAL_ENDING_PATTERN = /(?:[!?。！？]|\.(?!\.)).+/u
const ENGLISH_ABBREVIATION_PATTERN =
  /(?:^|\s)(?:Dr|Mr|Mrs|Ms|Prof|Rev|Hon|Gov|Pres|Sen|Rep|Gen|Lt|Col|Capt|Sgt|St|Mt|Jr|Sr|vs|[A-Z])\.\s*$/iu
const WRAPPING_QUOTES_PATTERN = /^["'“”‘’「」『』].*["'“”‘’「」『』]$/u
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
  return (WRAPPING_QUOTES_PATTERN.test(singleLine) ? singleLine.slice(1, -1) : singleLine).trim()
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
      : INTERNAL_ENDING_PATTERN.test(sentence)

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
