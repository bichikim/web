import {getDefaultParameterValueMap, type PuppetParameterValueMap} from '../../deformation'
import {sampleMotionParameterValues} from '../../player/internal/motion'
import {type EditParameterKeyframeOptions, setParameterKeyframe} from './motion-keyframes'

export interface InsertParameterKeyframeOptions extends EditParameterKeyframeOptions {
  readonly parameterValues?: PuppetParameterValueMap
}

export const insertParameterKeyframe = (options: InsertParameterKeyframeOptions) => {
  const motion = options.document.motions.find((candidate) => candidate.id === options.motionId)
  if (motion === undefined) {
    return undefined
  }
  const values = sampleMotionParameterValues({
    motion,
    parameters: options.document.parameters,
    parameterValues: options.parameterValues ?? getDefaultParameterValueMap(options.document),
    time: options.time,
  })
  const value = values[options.parameterId]
  return value === undefined ? undefined : setParameterKeyframe({...options, value})
}
