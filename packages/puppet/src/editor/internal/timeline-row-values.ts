import {getDefaultParameterValueMap, type PuppetParameterValueMap} from '../../deformation'
import type {PuppetDocument, PuppetMotion} from '../../player/document'
import {sampleKeyframes, sampleMotionParameterValues} from '../../player/internal/motion'
import {getEffectRows, getTrackRowId} from '../../player/timeline-rows'

/**
 * Every timeline row's value at `time`: parameters as the motion samples them, and model and
 * group opacity rows from their tracks or their defaults.
 */
export const sampleTimelineRowValues = (options: {
  readonly document: PuppetDocument
  readonly motion: PuppetMotion | undefined
  readonly parameterValues?: PuppetParameterValueMap
  readonly time: number
}): PuppetParameterValueMap => {
  const parameters = sampleMotionParameterValues({
    motion: options.motion,
    parameters: options.document.parameters,
    parameterValues: options.parameterValues ?? getDefaultParameterValueMap(options.document),
    time: options.time,
  })
  const effects = getEffectRows(options.document).map((row) => {
    const track = options.motion?.tracks.find(
      (candidate) =>
        candidate.kind !== 'parameter' && getTrackRowId(candidate, options.document) === row.id,
    )
    return [
      row.id,
      track === undefined ? row.defaultValue : sampleKeyframes(track.keyframes, options.time),
    ] as const
  })
  return {...parameters, ...Object.fromEntries(effects)}
}
