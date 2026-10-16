import {PUPPET_VOWELS, type PuppetVowelWeights} from '../document'
import type {MotionFrame} from '../playback/types'
import {analyzeVowels, measureVoiceLevel, toVowelWeights} from '../voice/analyze-vowels'
import type {PuppetSound} from './decode-wav'

/** Seconds of sound before the motion time that one frame analyzes. */
export const MOTION_SOUND_WINDOW = 0.05

/** The mouth that playing motion sounds ask for. */
export interface MotionSoundMouth {
  /** Loudness 0..1 for documents without mouth shapes (added to the lip-sync parameters). */
  readonly level: number
  /** Vowel weights for the document's mouth shapes. */
  readonly weights: PuppetVowelWeights
}

/** Samples in the analysis window ending at `time`, or `undefined` once the sound has ended. */
export const getMotionSoundWindow = (sound: PuppetSound, time: number) => {
  const {length} = sound.mono
  if (!(time >= 0) || time >= length / sound.sampleRate) {
    return undefined
  }
  const end = Math.min(length, Math.floor(time * sound.sampleRate))
  const start = Math.max(0, end - Math.round(MOTION_SOUND_WINDOW * sound.sampleRate))
  return sound.mono.subarray(start, end)
}

/**
 * Analyzes each frame's motion sound at the frame's motion time and sums the results weighted by
 * the frames' fade weights; `undefined` when no frame's sound is loaded and still lasting.
 */
export const getMotionSoundMouth = (
  frames: ReadonlyArray<MotionFrame>,
  getSound: (src: string) => PuppetSound | undefined,
): MotionSoundMouth | undefined => {
  let sounding = false
  let level = 0
  const weights = PUPPET_VOWELS.map(() => 0)
  for (const frame of frames) {
    const src = frame.motion.sound?.src
    const sound = src === undefined ? undefined : getSound(src)
    const samples = sound === undefined ? undefined : getMotionSoundWindow(sound, frame.time)
    if (sound !== undefined && samples !== undefined) {
      sounding = true
      const analysis = analyzeVowels(samples, sound.sampleRate)
      level += frame.weight * measureVoiceLevel(samples)
      for (const [index, vowel] of PUPPET_VOWELS.entries()) {
        weights[index]! += frame.weight * analysis.weights[vowel]
      }
    }
  }
  return sounding ? {level: Math.min(1, level), weights: toVowelWeights(weights)} : undefined
}
