import type {LipSyncShape} from '@winter-love/wallpaper/settings/lipsync'
import {speechShapes} from './speech-shapes'

export interface SpeechCue {
  readonly end: number
  readonly shape: LipSyncShape | null
}

const CLOSURE_WEIGHT = 0.25
const SPACE_WEIGHT = 0.1
const PAUSE_WEIGHT = 0.55
const cueWeight = (shape: LipSyncShape | null, character: string): number => {
  if (shape === 'closed') {
    return CLOSURE_WEIGHT
  }
  if (shape === null) {
    return /\s/u.test(character) ? SPACE_WEIGHT : PAUSE_WEIGHT
  }
  return 1
}

/** Estimates shape durations in seconds; closures and word spaces are shorter than vowels. */
export const createSpeechCues = (text: string, duration: number): readonly SpeechCue[] => {
  if (!Number.isFinite(duration) || duration <= 0) {
    return []
  }
  const weighted = Array.from(text.normalize('NFC')).flatMap((character) =>
    speechShapes(character).map((shape) => ({
      shape,
      weight: cueWeight(shape, character),
    })),
  )
  const total = weighted.reduce((sum, cue) => sum + cue.weight, 0)
  let elapsed = 0
  return weighted.map((cue, index) => {
    elapsed += cue.weight
    return {
      end: index === weighted.length - 1 ? duration : (elapsed / total) * duration,
      shape: cue.shape,
    }
  })
}
