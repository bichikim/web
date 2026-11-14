import {analyzeVowels} from '@winter-love/puppet/player'
import type {LipSyncWeights} from '../lipsync/types'
import type {VoiceAudio} from './synthesis'

const WINDOW_SECONDS = 0.04
const MINIMUM_RATE = 8000

/** Normalized acoustic vowel probabilities from a centered PCM window; text is not consulted. */
export const analyzeSpeechFrame = (audio: VoiceAudio, time: number): LipSyncWeights => {
  const duration = audio.samples.length / audio.sampleRate
  if (!Number.isFinite(time) || time < 0 || time >= duration || audio.sampleRate < MINIMUM_RATE) {
    return {}
  }
  const size = Math.round(audio.sampleRate * WINDOW_SECONDS)
  const start = Math.max(
    0,
    Math.min(audio.samples.length - size, Math.round(time * audio.sampleRate) - size / 2),
  )
  const samples = audio.samples.subarray(start, start + size)
  const result = analyzeVowels(samples, audio.sampleRate)
  return result.level <= 0
    ? {}
    : Object.fromEntries(
        Object.entries(result.weights).map(([shape, weight]) => [shape, weight / result.level]),
      )
}
