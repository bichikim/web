import type {PuppetDeformerRenderProperties} from '../player/document'
import {getDeformerRenderProperties} from './group-properties'
import {fromColorEffectCoordinates, toColorEffectCoordinates} from './keyed-color-effect'
import {sampleParameterCoordinates} from './parameter'
import type {SampleParameterDeformerOptions} from './scene'

/**
 * A deformer's keyed opacity and colors at the binding's values, or `undefined` when no keyform
 * keys them, so a sampled keyform stays as sparse as the ones it comes from.
 */
export const sampleDeformerProperties = (
  options: SampleParameterDeformerOptions,
): PuppetDeformerRenderProperties | undefined => {
  const keyed = options.binding.keyforms.map(
    (keyform) =>
      keyform.deformers?.find((candidate) => candidate.nodeId === options.deformer.id)?.properties,
  )
  if (keyed.every((properties) => properties === undefined)) {
    return undefined
  }
  const rest = getDeformerRenderProperties(options.deformer)
  const coordinates = (properties: PuppetDeformerRenderProperties) =>
    toColorEffectCoordinates({
      multiplyColor: properties.multiplyColor ?? rest.multiplyColor,
      opacity: properties.opacity ?? rest.opacity,
      screenColor: properties.screenColor ?? rest.screenColor,
    })
  return fromColorEffectCoordinates(
    sampleParameterCoordinates({
      binding: options.binding,
      keyformCoordinates: keyed.map((properties) =>
        properties === undefined ? undefined : coordinates(properties),
      ),
      repeatRanges: options.repeatRanges,
      restCoordinates: coordinates({}),
      values: options.values,
    }),
  )
}
