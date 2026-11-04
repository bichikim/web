import type {LipSyncWeights} from './types'
import {LIP_SYNC_MOUTH_POSES, type MouthPose} from '@winter-love/wallpaper/lipsync/mouth-poses'
import {
  LIP_SYNC_SHAPES,
  type LipSyncShape,
  type PoffoLipSync,
} from '@winter-love/wallpaper/settings/lipsync'
import type {TrackingParameter} from '../tracking/types'

export interface MouthPair {
  readonly opening: TrackingParameter
  readonly form: TrackingParameter
}
/** Only recognizes the complete canonical pair; a lone opening parameter is not a vowel pose. */
export const resolveMouthPair = (
  parameters: readonly TrackingParameter[],
): MouthPair | undefined => {
  const opening = parameters.filter((parameter) => parameter.id === 'ParamMouthOpenY')
  const form = parameters.filter((parameter) => parameter.id === 'ParamMouthForm')
  return opening.length === 1 && form.length === 1
    ? {form: form[0]!, opening: opening[0]!}
    : undefined
}
const DEFORMATION_CURVE = 3
const FORM_OPENING = 0.2
const NEUTRAL_OPENING = 0.45
const blendedPose = (weights: LipSyncWeights, options: Partial<PoffoLipSync>): MouthPose => {
  const entries = LIP_SYNC_SHAPES.map((shape) => [shape, weights[shape] ?? 0] as const)
  const sum = entries.reduce((total, [, weight]) => total + weight, 0)
  return entries.reduce(
    (blended, [shape, weight]) => {
      const pose = LIP_SYNC_MOUTH_POSES.get(shape)!
      const inverted = options.shapes?.[shape]?.inverted ?? options.inverted
      return {
        form: blended.form + pose.form * weight * (inverted ? -1 : 1),
        open: blended.open + pose.open * weight,
      }
    },
    {form: 0, open: NEUTRAL_OPENING * Math.max(0, 1 - sum)},
  )
}
/** Blends coordinates and relaxes mouth deformation continuously as opening approaches zero. */
export const mouthPairValues = (
  pair: MouthPair,
  shape: LipSyncShape | LipSyncWeights | null,
  level: number,
  options: Partial<PoffoLipSync>,
): Readonly<Record<string, number>> => {
  const amount = Number.isFinite(level) ? Math.max(0, Math.min(1, level * (options.gain ?? 1))) : 0
  const weights = typeof shape === 'object' && shape !== null ? shape : {[shape ?? 'closed']: 1}
  const pose = blendedPose(weights, options)
  const open = pose.open * amount
  const fraction = Math.min(1, open / FORM_OPENING)
  const deformation = fraction * fraction * (DEFORMATION_CURVE - 2 * fraction)
  const form = amount === 0 ? 0 : pose.form * deformation
  return {
    [pair.opening.id]: Math.max(pair.opening.minimum, Math.min(pair.opening.maximum, open)),
    [pair.form.id]: Math.max(pair.form.minimum, Math.min(pair.form.maximum, form)),
  }
}
