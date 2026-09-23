import type {SupertonicLanguage} from '../language'

export type SpeechNumberKind =
  | 'cardinal'
  | 'count'
  | 'digits'
  | 'identifier'
  | 'ordinal'
  | 'preserve'
  | 'year-date-time'

export interface SpeechNumberDecision {
  readonly confidence: number
  readonly kind: SpeechNumberKind
}

export interface ClassifySpeechNumberOptions {
  readonly end: number
  readonly language: SupertonicLanguage
  readonly start: number
  readonly text: string
}
