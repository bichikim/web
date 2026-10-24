import type {SupertonicLanguage} from '../language'
import {classifySpeechNumber} from './classify-speech-number'
import type {SpeechNumberKind} from './types'

/** Checks the classified role of a number within its surrounding text. */
// oxlint-disable-next-line eslint/max-params -- The context mirrors the regex match and the requested speech role.
export const hasNumberKind = (
  language: SupertonicLanguage,
  text: string,
  start: number,
  value: string,
  kind: SpeechNumberKind,
): boolean => classifySpeechNumber({end: start + value.length, language, start, text}).kind === kind
