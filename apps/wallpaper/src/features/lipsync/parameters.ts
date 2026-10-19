import type {PoffoLipSync} from '@winter-love/wallpaper/settings/lipsync'
import type {TrackingParameter} from '../tracking/types'

const MOUTH_ALIASES = new Set(['mouthopen', 'mouthopeny', 'parammouthopeny', '입열림'])
/** Resolves an explicit connection or a single recognized mouth-opening parameter. */
export const resolveLipSyncParameter = (
  parameters: readonly TrackingParameter[],
  selected?: string | null,
): TrackingParameter | undefined => {
  if (selected === null) {
    return undefined
  }
  if (selected !== undefined) {
    return parameters.find((parameter) => parameter.id === selected)
  }
  const matches = parameters.filter((parameter) =>
    [parameter.id, parameter.name ?? ''].some((value) =>
      MOUTH_ALIASES.has(value.replace(/[-_\s]/gu, '').toLowerCase()),
    ),
  )
  return matches.length === 1 ? matches[0] : undefined
}

/** Maps normalized opening to the chosen parameter without exceeding its authored range. */
export const lipSyncValue = (
  parameter: TrackingParameter,
  level: number,
  options: Partial<PoffoLipSync>,
): number => {
  const amount = Number.isFinite(level) ? Math.max(0, Math.min(1, level * (options.gain ?? 1))) : 0
  const start = options.inverted
    ? parameter.minimum + parameter.maximum - parameter.defaultValue
    : parameter.defaultValue
  const end = options.inverted ? parameter.minimum : parameter.maximum
  return start + (end - start) * amount
}
