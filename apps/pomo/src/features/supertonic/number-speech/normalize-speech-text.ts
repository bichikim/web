import type {SupertonicLanguage} from '../language'
import {normalizeEnglishSpeechText} from './normalize-english-speech-text'
import {normalizeKoreanSpeechText} from './normalize-korean-speech-text'
import {UNSIGNED_INTEGER_PATTERN_SOURCE} from './number-patterns'

const PROTECTED_RANGE_NUMBER_SOURCE = `${UNSIGNED_INTEGER_PATTERN_SOURCE}(?:\\.\\d+)?`
const PROTECTED_NUMBER_SOURCE = [
  'https?:\\/\\/\\S+',
  'www\\.\\S+',
  '[\\p{L}\\p{N}._%+-]+@[\\p{L}\\p{N}.-]+\\.[\\p{L}]{2,}',
  `\\b(?:between|from)\\s+${PROTECTED_RANGE_NUMBER_SOURCE}` +
    `\\s+(?:and|to|through)\\s+${PROTECTED_RANGE_NUMBER_SOURCE}\\b`,
  `(?<!\\d)${PROTECTED_RANGE_NUMBER_SOURCE}` +
    `\\s*(?:~|–|—|에서|부터|내지|to|through)\\s*${PROTECTED_RANGE_NUMBER_SOURCE}(?!\\d)`,
  '\\b(?:version|model|room|chapter|episode|id)\\s+\\d+(?:\\.\\d+)*(?:st|nd|rd|th)?\\b',
  '\\b\\d+(?:[.-]\\d+){2,}\\b',
].join('|')
const PROTECTED_NUMBER_PATTERN = new RegExp(PROTECTED_NUMBER_SOURCE, 'giu')

export interface NormalizeSpeechTextOptions {
  readonly language: SupertonicLanguage
  readonly text: string
}

const getNormalizer = (language: SupertonicLanguage): ((text: string) => string) | null => {
  if (language === 'en') {
    return normalizeEnglishSpeechText
  }

  return language === 'ko' ? normalizeKoreanSpeechText : null
}

/** Produces deterministic model input while preserving ambiguous and unsupported number forms. */
export const normalizeSpeechText = (options: NormalizeSpeechTextOptions): string => {
  const normalize = getNormalizer(options.language)

  if (normalize === null) {
    return options.text
  }

  let result = ''
  let position = 0

  for (const match of options.text.matchAll(PROTECTED_NUMBER_PATTERN)) {
    const {index} = match
    result += normalize(options.text.slice(position, index))
    result += match[0]
    position = index + match[0].length
  }

  return result + normalize(options.text.slice(position))
}
