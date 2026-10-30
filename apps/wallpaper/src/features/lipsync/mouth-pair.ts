import {LIP_SYNC_MOUTH_POSES} from '@winter-love/wallpaper/lipsync/mouth-poses'
import type {LipSyncShape, PoffoLipSync} from '@winter-love/wallpaper/settings/lipsync'
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
/** Keeps the vowel form independent of loudness while scaling opening within authored limits. */
export const mouthPairValues = (
  pair: MouthPair,
  shape: LipSyncShape | null,
  level: number,
  options: Partial<PoffoLipSync>,
): Readonly<Record<string, number>> => {
  const amount = Number.isFinite(level) ? Math.max(0, Math.min(1, level * (options.gain ?? 1))) : 0
  const pose = LIP_SYNC_MOUTH_POSES.get(shape ?? 'closed')!
  const open = pose.open * amount
  const form = amount > 0 ? pose.form * (options.inverted ? -1 : 1) : 0
  return {
    [pair.opening.id]: Math.max(pair.opening.minimum, Math.min(pair.opening.maximum, open)),
    [pair.form.id]: Math.max(pair.form.minimum, Math.min(pair.form.maximum, form)),
  }
}
