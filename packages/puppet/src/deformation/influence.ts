import type {
  PuppetDocument,
  PuppetParameterBinding,
  PuppetParameterInfluence,
} from '../player/document'
import type {PuppetParameterValueMap} from './composition'

export interface GetBindingInfluenceOptions {
  readonly binding: PuppetParameterBinding
  readonly document: PuppetDocument
  readonly parameterValues?: PuppetParameterValueMap
}

export const sampleInfluence = (relation: PuppetParameterInfluence, value: number): number => {
  const nextIndex = relation.points.findIndex((point) => point.value >= value)
  const next = relation.points[nextIndex]
  if (next === undefined) {
    return relation.points.at(-1)?.weight ?? 1
  }
  const previous = relation.points[nextIndex - 1]
  if (previous === undefined) {
    return next.weight
  }
  const progress = (value - previous.value) / (next.value - previous.value)
  return previous.weight + (next.weight - previous.weight) * progress
}

/** Returns the minimum curve weight evaluated from raw, clamped parameter inputs. */
export const getBindingInfluence = (options: GetBindingInfluenceOptions): number => {
  let weight = 1
  for (const relation of options.binding.influences ?? []) {
    const parameter = options.document.parameters?.find(
      (candidate) => candidate.id === relation.parameterId,
    )
    if (parameter !== undefined) {
      const input = options.parameterValues?.[parameter.id]
      const value =
        input === undefined || !Number.isFinite(input)
          ? parameter.defaultValue
          : Math.max(parameter.minimum, Math.min(parameter.maximum, input))
      weight = Math.min(weight, sampleInfluence(relation, value))
    }
  }
  return weight
}
