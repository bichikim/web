import type {PuppetParameterValueMap} from '../../deformation'
import {PUPPET_VOWELS, type PuppetDocument, type PuppetVowelWeights} from '../document'
import {resolveParameterValue} from '../parameter-value'
import {toVowelWeights} from './analyze-vowels'

export const DEFAULT_MOUTH_SHAPE_SMOOTHING = 0.06
/** Shown weights below this total, with no target, have faded out. */
const FADED = 0.0001

/** Weights shown now and the ones they move toward; no target fades them out. */
export interface MouthShapesState {
  readonly shown: PuppetVowelWeights
  readonly target?: PuppetVowelWeights
}

const total = (weights: PuppetVowelWeights) =>
  PUPPET_VOWELS.reduce((sum, vowel) => sum + weights[vowel], 0)

/** Each weight within 0..1, scaled down together when they sum above 1. */
export const normalizeVowelWeights = (weights: Partial<PuppetVowelWeights>): PuppetVowelWeights => {
  const clamped = toVowelWeights(
    PUPPET_VOWELS.map((vowel) => {
      const weight = weights[vowel] ?? 0
      return Number.isFinite(weight) ? Math.min(1, Math.max(0, weight)) : 0
    }),
  )
  const sum = total(clamped)
  return sum > 1 ? toVowelWeights(PUPPET_VOWELS.map((vowel) => clamped[vowel] / sum)) : clamped
}

/**
 * Moves the shown weights toward the target with time constant `smoothing` seconds; `undefined`
 * once they have faded out with no target.
 */
export const advanceMouthShapes = (
  state: MouthShapesState,
  deltaTime: number,
  smoothing = DEFAULT_MOUTH_SHAPE_SMOOTHING,
): MouthShapesState | undefined => {
  const step = smoothing > 0 ? 1 - Math.exp(-Math.max(0, deltaTime) / smoothing) : 1
  const target = state.target ?? toVowelWeights([])
  const shown = toVowelWeights(
    PUPPET_VOWELS.map((vowel) => state.shown[vowel] + (target[vowel] - state.shown[vowel]) * step),
  )
  return state.target === undefined && total(shown) < FADED ? undefined : {...state, shown}
}

/**
 * Blends each vowel's mouth shape into its parameters over their current values:
 * `value · (1 − Σ w) + Σ w · shape`, so silence keeps the motion's mouth.
 */
export const applyMouthShapes = (
  document: PuppetDocument,
  values: PuppetParameterValueMap,
  weights: PuppetVowelWeights,
): PuppetParameterValueMap => {
  const shapes = document.mouthShapes
  if (shapes === undefined) {
    return values
  }
  const sum = total(weights)
  const next = {...values}
  for (const [index, parameterId] of shapes.parameterIds.entries()) {
    const parameter = document.parameters?.find((candidate) => candidate.id === parameterId)
    if (parameter !== undefined) {
      const current = resolveParameterValue(parameter, values[parameterId])
      const shaped = PUPPET_VOWELS.reduce(
        (value, vowel) => value + weights[vowel] * shapes.vowels[vowel][index]!,
        current * (1 - sum),
      )
      next[parameterId] = resolveParameterValue(parameter, shaped)
    }
  }
  return next
}
