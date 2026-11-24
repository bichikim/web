import {analyzeVowels, measureVoiceLevel} from '@winter-love/puppet/player'
import {LIP_SYNC_SHAPES, type LipSyncShape} from '@winter-love/wallpaper/settings/lipsync'
import type {VoiceAudio} from '../voice/synthesis'
import type {LipSyncWeights} from './types'

const ATTACK_SECONDS = 0.035
const RELEASE_SECONDS = 0.09
const FORM_SECONDS = 0.05
const SILENT_LEVEL = 0.005

/** Smooths live acoustic poses and applies the adjustable gate before the authored movement gain. */
export const createMicrophoneAnalysis = () => {
  let level = 0
  let weights: LipSyncWeights = {}
  return (audio: VoiceAudio, threshold: number) => {
    const inputLevel = measureVoiceLevel(audio.samples)
    const analysis = analyzeVowels(audio.samples, audio.sampleRate)
    const target = inputLevel > threshold ? analysis.level : 0
    const seconds = audio.samples.length / audio.sampleRate
    const opening = 1 - Math.exp(-seconds / (target > level ? ATTACK_SECONDS : RELEASE_SECONDS))
    level += (target - level) * opening
    const response = 1 - Math.exp(-seconds / FORM_SECONDS)
    weights = Object.fromEntries(
      LIP_SYNC_SHAPES.map((shape) => {
        const previous = weights[shape] ?? 0
        const next =
          target > 0 && analysis.level > 0
            ? (analysis.weights[shape] ?? 0) / analysis.level
            : previous
        return [shape, previous + (next - previous) * response]
      }),
    )
    const shape = LIP_SYNC_SHAPES.reduce<LipSyncShape>(
      (best, next) => ((weights[next] ?? 0) > (weights[best] ?? 0) ? next : best),
      'a',
    )
    return {
      inputLevel,
      level: level < SILENT_LEVEL ? 0 : level,
      shape: target > 0 ? shape : null,
      weights,
    }
  }
}
