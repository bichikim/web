import type {PuppetDocument} from '../../player'
import type {PuppetParameterValueMap} from '../../deformation'

interface GetMotionParameterOverridesOptions {
  readonly document: PuppetDocument
  readonly motionId?: string
  readonly parameterValues?: PuppetParameterValueMap
}

export const getMotionParameterOverrides = (
  options: GetMotionParameterOverridesOptions,
): PuppetParameterValueMap => {
  const motion =
    options.motionId === undefined
      ? options.document.motions[0]
      : options.document.motions.find((candidate) => candidate.id === options.motionId)
  const animated = new Set(
    motion?.tracks.flatMap((track) =>
      track.kind === 'parameter' && track.keyframes.length > 0 ? [track.parameterId] : [],
    ),
  )
  return Object.fromEntries(
    Object.entries(options.parameterValues ?? {}).filter(([id]) => !animated.has(id)),
  )
}
