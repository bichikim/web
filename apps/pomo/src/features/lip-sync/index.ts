export const P_VISEMES = ['rest', 'closed', 'open', 'wide', 'round', 'narrow'] as const
export const P_VISEME_COARTICULATION_MS = 50

export type PViseme = (typeof P_VISEMES)[number]

export {
  createPAudioEnvelope,
  createPVisemeDriver,
  createPWaveEnvelope,
  getPAudioEnvelopeLevel,
  type PAudioEnvelope,
  type PVisemeDriver,
} from './audio-driven-viseme'

export interface PVisemeCue {
  readonly endMs: number
  readonly startMs: number
  readonly viseme: PViseme
}

export interface CreatePVisemeTrackOptions {
  readonly durationMs: number
  readonly text: string
}

interface WeightedViseme {
  readonly viseme: PViseme
  readonly weight: number
}

const HANGUL_BASE = 0xac00
const HANGUL_END = 0xd7a3
const HANGUL_FINAL_COUNT = 28
const HANGUL_VOWEL_COUNT = 21
const HANGUL_BLOCK_SIZE = HANGUL_FINAL_COUNT * HANGUL_VOWEL_COUNT
const MINIMUM_CUE_DURATION_MS = 70
const ONSET_CLOSURE_WEIGHT = 0.28
const FINAL_CLOSURE_WEIGHT = 0.22
const LONG_PAUSE_WEIGHT = 0.55
const SHORT_PAUSE_WEIGHT = 0.3
const WHITESPACE_WEIGHT = 0.1
const DEFAULT_CHARACTER_WEIGHT = 0.7
const HANGUL_BIEUP_ONSET_INDEX = 7
const HANGUL_MIEUM_ONSET_INDEX = 6
const HANGUL_PIEUP_ONSET_INDEX = 17
const HANGUL_MIEUM_FINAL_INDEX = 16
const HANGUL_BIEUP_FINAL_INDEX = 17
const HANGUL_BIEUP_SIOS_FINAL_INDEX = 18
const HANGUL_PIEUP_FINAL_INDEX = 26

const VOWEL_VISEMES: ReadonlyArray<PViseme> = [
  'open',
  'wide',
  'open',
  'wide',
  'open',
  'wide',
  'open',
  'wide',
  'round',
  'open',
  'wide',
  'wide',
  'round',
  'round',
  'open',
  'wide',
  'round',
  'round',
  'narrow',
  'wide',
  'wide',
]
const BILABIAL_ONSETS = new Set([
  HANGUL_MIEUM_ONSET_INDEX,
  HANGUL_BIEUP_ONSET_INDEX,
  HANGUL_PIEUP_ONSET_INDEX,
])
const BILABIAL_FINALS = new Set([
  HANGUL_MIEUM_FINAL_INDEX,
  HANGUL_BIEUP_FINAL_INDEX,
  HANGUL_BIEUP_SIOS_FINAL_INDEX,
  HANGUL_PIEUP_FINAL_INDEX,
])
const LONG_PAUSE_PATTERN = /[.!?;:…。！？]/u
const SHORT_PAUSE_PATTERN = /[,，、]/u
const WHITESPACE_PATTERN = /\s/u
const LATIN_OPEN_PATTERN = /a/u
const LATIN_WIDE_PATTERN = /[ei]/u
const LATIN_ROUND_PATTERN = /[ou]/u
const LATIN_CLOSED_PATTERN = /[bmp]/u

const getLatinViseme = (character: string): PViseme => {
  const normalizedCharacter = character.toLowerCase()

  if (LATIN_OPEN_PATTERN.test(normalizedCharacter)) {
    return 'open'
  }
  if (LATIN_WIDE_PATTERN.test(normalizedCharacter)) {
    return 'wide'
  }
  if (LATIN_ROUND_PATTERN.test(normalizedCharacter)) {
    return 'round'
  }
  if (LATIN_CLOSED_PATTERN.test(normalizedCharacter)) {
    return 'closed'
  }
  return 'narrow'
}

const appendWeightedViseme = (visemes: Array<WeightedViseme>, viseme: PViseme, weight: number) => {
  const previous = visemes.at(-1)

  if (previous?.viseme === viseme) {
    visemes[visemes.length - 1] = {viseme, weight: previous.weight + weight}
    return
  }

  visemes.push({viseme, weight})
}

const appendHangulSyllable = (visemes: Array<WeightedViseme>, codePoint: number) => {
  const syllableIndex = codePoint - HANGUL_BASE
  const onsetIndex = Math.floor(syllableIndex / HANGUL_BLOCK_SIZE)
  const vowelIndex = Math.floor((syllableIndex % HANGUL_BLOCK_SIZE) / HANGUL_FINAL_COUNT)
  const finalIndex = syllableIndex % HANGUL_FINAL_COUNT

  if (BILABIAL_ONSETS.has(onsetIndex)) {
    appendWeightedViseme(visemes, 'closed', ONSET_CLOSURE_WEIGHT)
  }

  appendWeightedViseme(visemes, VOWEL_VISEMES[vowelIndex]!, 1)

  if (BILABIAL_FINALS.has(finalIndex)) {
    appendWeightedViseme(visemes, 'closed', FINAL_CLOSURE_WEIGHT)
  }
}

const appendCharacter = (visemes: Array<WeightedViseme>, character: string) => {
  const codePoint = character.codePointAt(0)

  if (codePoint !== undefined && codePoint >= HANGUL_BASE && codePoint <= HANGUL_END) {
    appendHangulSyllable(visemes, codePoint)
    return
  }

  if (LONG_PAUSE_PATTERN.test(character)) {
    appendWeightedViseme(visemes, 'rest', LONG_PAUSE_WEIGHT)
    return
  }

  if (SHORT_PAUSE_PATTERN.test(character)) {
    appendWeightedViseme(visemes, 'rest', SHORT_PAUSE_WEIGHT)
    return
  }

  if (WHITESPACE_PATTERN.test(character)) {
    appendWeightedViseme(visemes, 'rest', WHITESPACE_WEIGHT)
    return
  }

  appendWeightedViseme(visemes, getLatinViseme(character), DEFAULT_CHARACTER_WEIGHT)
}

const createWeightedVisemes = (text: string) => {
  const visemes: Array<WeightedViseme> = []

  for (const character of text.normalize('NFC')) {
    appendCharacter(visemes, character)
  }

  if (visemes.length === 0) {
    return [{viseme: 'rest', weight: 1}] satisfies ReadonlyArray<WeightedViseme>
  }

  return visemes
}

const mergeShortCues = (cues: ReadonlyArray<PVisemeCue>) => {
  const merged: Array<PVisemeCue> = []

  for (const cue of cues) {
    const previous = merged.at(-1)
    const durationMs = cue.endMs - cue.startMs

    if (previous !== undefined && durationMs < MINIMUM_CUE_DURATION_MS) {
      merged[merged.length - 1] = {...previous, endMs: cue.endMs}
    } else {
      merged.push(cue)
    }
  }

  return merged
}

/** Maps written pronunciation cues onto the exact rendered audio duration. */
export const createPVisemeTrack = (
  options: CreatePVisemeTrackOptions,
): ReadonlyArray<PVisemeCue> => {
  const durationMs = Math.max(0, options.durationMs)

  if (durationMs === 0) {
    return []
  }

  const visemes = createWeightedVisemes(options.text)
  const totalWeight = visemes.reduce((total, viseme) => total + viseme.weight, 0)
  let startMs = 0
  const cues = visemes.map((weightedViseme, index): PVisemeCue => {
    const isLast = index === visemes.length - 1
    const endMs = isLast
      ? durationMs
      : Math.min(durationMs, startMs + (weightedViseme.weight / totalWeight) * durationMs)
    const cue = {endMs, startMs, viseme: weightedViseme.viseme}
    startMs = endMs
    return cue
  })

  return mergeShortCues(cues)
}

/** Resolves the current mouth shape from an audio-clock position. */
export const getPVisemeAtTime = (
  cues: ReadonlyArray<PVisemeCue>,
  currentTimeMs: number,
): PViseme => {
  if (currentTimeMs < 0) {
    return 'rest'
  }

  const cue = cues.find((candidate) => currentTimeMs < candidate.endMs)
  return cue?.viseme ?? 'rest'
}

/** Anticipates the next cue so the renderer can crossfade into it before its audio boundary. */
export const getPCoarticulatedVisemeAtTime = (
  cues: ReadonlyArray<PVisemeCue>,
  currentTimeMs: number,
): PViseme => {
  if (currentTimeMs < 0) {
    return 'rest'
  }

  return getPVisemeAtTime(cues, currentTimeMs + P_VISEME_COARTICULATION_MS)
}
