import {
  LIP_SYNC_SHAPES,
  type LipSyncShape,
  type PoffoLipSync,
} from '@winter-love/wallpaper/settings/lipsync'
import type {PoffoTrackingBinding} from '@winter-love/wallpaper/settings/tracking'
import type {TrackingParameter} from '../tracking/types'
import type {LipSyncFrame} from './channel'
import type {LipSyncWeights} from './types'
import {type MouthPair, mouthPairValues} from './mouth-pair'
import {lipSyncValue} from './parameters'

interface ParameterConnection {
  readonly shape: LipSyncShape
  readonly parameter: TrackingParameter
  readonly binding: PoffoTrackingBinding
}
interface FrameValuesOptions {
  readonly pair?: MouthPair
  readonly automatic: readonly LipSyncShape[]
  readonly resting: Readonly<Record<string, number>>
  readonly connections: readonly ParameterConnection[]
  readonly settings: PoffoLipSync
  readonly formOrigin?: number
}
const automaticWeights = (
  weights: LipSyncWeights,
  shapes: readonly LipSyncShape[],
): LipSyncWeights =>
  LIP_SYNC_SHAPES.reduce<Partial<Record<LipSyncShape, number>>>((result, shape) => {
    const target = shapes.includes(shape) ? shape : 'closed'
    result[target] = (result[target] ?? 0) + (weights[shape] ?? 0)
    return result
  }, {})
const automaticPose = (
  input: LipSyncFrame | null,
  shapes: readonly LipSyncShape[],
): LipSyncWeights | LipSyncShape | null => {
  if (input?.weights !== undefined) {
    return automaticWeights(input.weights, shapes)
  }
  const shape = input?.shape ?? null
  return shape !== null && shapes.includes(shape) ? shape : null
}
const motionValues = (
  input: LipSyncFrame | null,
  options: FrameValuesOptions,
  pose: LipSyncWeights | LipSyncShape | null,
): Readonly<Record<string, number>> => {
  const motion = input?.motion
  const {pair} = options
  if (motion === undefined || pair === undefined || pose === null) {
    return {}
  }
  const target =
    motion.phase === 'prepare'
      ? mouthPairValues(pair, pose, 1, {...options.settings, gain: 1})[pair.form.id]!
      : (options.formOrigin ?? 0)
  return {[pair.form.id]: target * motion.weight}
}

/** Projects a blended acoustic frame onto automatic and individually configured parameters. */
export const frameValues = (
  input: LipSyncFrame | null,
  options: FrameValuesOptions,
): Readonly<Record<string, number>> => {
  const pose = automaticPose(input, options.automatic)
  const values = {
    ...options.resting,
    ...(options.pair !== undefined && pose !== null
      ? mouthPairValues(options.pair, pose, input?.level ?? 0, {
          ...options.settings,
          openingWeights:
            input?.openingWeights === undefined
              ? undefined
              : automaticWeights(input.openingWeights, options.automatic),
        })
      : {}),
    ...motionValues(input, options, pose),
  }
  if (input !== null) {
    const {weights} = input
    for (const {binding, parameter, shape} of options.connections) {
      const weight = weights === undefined ? (input.shape === shape ? 1 : 0) : (weights[shape] ?? 0)
      if (weight > 0) {
        const settings = {...binding, gain: options.settings.gain}
        const contribution =
          lipSyncValue(parameter, input.level * weight, settings) -
          lipSyncValue(parameter, 0, settings)
        values[parameter.id] = (values[parameter.id] ?? parameter.defaultValue) + contribution
      }
    }
  }
  for (const {parameter} of options.connections) {
    values[parameter.id] = Math.max(
      parameter.minimum,
      Math.min(parameter.maximum, values[parameter.id]!),
    )
  }
  return values
}
