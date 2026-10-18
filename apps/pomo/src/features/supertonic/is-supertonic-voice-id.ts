import {SUPERTONIC_VOICES, type SupertonicVoiceId} from './model'

/** Checks exact membership in the current voice catalog. */
export const isSupertonicVoiceId = (value: unknown): value is SupertonicVoiceId =>
  SUPERTONIC_VOICES.some((voice) => voice.id === value)
