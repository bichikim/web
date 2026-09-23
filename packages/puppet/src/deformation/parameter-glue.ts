import {clamp} from 'es-toolkit/math'
import type {PuppetDocument, PuppetGlue, PuppetParameterBinding} from '../player/document'
import {getParameterBindingValues, type PuppetParameterValueMap} from './composition'
import {getBindingInfluence} from './influence'
import {type PuppetParameterValues, sampleParameterCoordinates} from './parameter'

interface SampleGlueOptions {
  readonly binding: PuppetParameterBinding
  readonly glue: PuppetGlue
  readonly values: PuppetParameterValues
}

export const sampleParameterGlue = (options: SampleGlueOptions) => {
  const restCoordinates = [options.glue.weight, options.glue.strength]
  const coordinates = sampleParameterCoordinates({
    binding: options.binding,
    keyformCoordinates: options.binding.keyforms.map((keyform) => {
      const value = keyform.parts
        .find((part) => part.partId === options.glue.first.partId)
        ?.glue?.find((glue) => glue.id === options.glue.id)
      return value === undefined ? undefined : [value.weight, value.strength]
    }),
    restCoordinates,
    values: options.values,
  })
  return {id: options.glue.id, strength: coordinates[1]!, weight: coordinates[0]!}
}

interface ComposeGlueOptions {
  readonly document: PuppetDocument
  readonly parameterValues?: PuppetParameterValueMap
}

export const composeParameterGlue = (options: ComposeGlueOptions): ReadonlyArray<PuppetGlue> =>
  (options.document.glue ?? []).map((glue) => {
    let {weight} = glue
    let {strength} = glue
    for (const binding of options.document.parameterBindings ?? []) {
      if (
        binding.targetPartIds?.includes(glue.first.partId) ??
        binding.keyforms.some((keyform) =>
          keyform.parts.some((part) => part.partId === glue.first.partId),
        )
      ) {
        const sampled = sampleParameterGlue({
          binding,
          glue,
          values: getParameterBindingValues({...options, binding}),
        })
        const influence = getBindingInfluence({...options, binding})
        weight += (sampled.weight - glue.weight) * influence
        strength += (sampled.strength - glue.strength) * influence
      }
    }
    return {
      ...glue,
      strength: clamp(strength, 0, 1),
      weight: 'edge' in glue.second ? 1 : clamp(weight, 0, 1),
    }
  })
