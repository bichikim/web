import type {PuppetParameterValueMap} from '../../deformation'
import {sampleTimelineRowValues} from './timeline-row-values'
import {type EditParameterKeyframeOptions, setParameterKeyframe} from './motion-keyframes'

export interface InsertParameterKeyframeOptions extends EditParameterKeyframeOptions {
  readonly parameterValues?: PuppetParameterValueMap
}

export const insertParameterKeyframe = (options: InsertParameterKeyframeOptions) => {
  const motion = options.document.motions.find((candidate) => candidate.id === options.motionId)
  if (motion === undefined) {
    return undefined
  }
  const values = sampleTimelineRowValues({
    document: options.document,
    motion,
    parameterValues: options.parameterValues,
    time: options.time,
  })
  const value = values[options.parameterId]
  return value === undefined ? undefined : setParameterKeyframe({...options, value})
}
