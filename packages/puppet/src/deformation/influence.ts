import type {
  PuppetDocument,
  PuppetKeyformSampling,
  PuppetParameterBinding,
  PuppetParameterInfluence,
} from '../player/document'
import type {PuppetParameterValueMap} from './composition'

const DEFAULT_KEY_TOLERANCE = 0.0001

export interface GetBindingInfluenceOptions {
  readonly binding: PuppetParameterBinding
  readonly document: PuppetDocument
  readonly parameterValues?: PuppetParameterValueMap
}

export const sampleInfluence = (
  relation: PuppetParameterInfluence,
  value: number,
  sampling?: PuppetKeyformSampling,
): number => {
  const rounded = sampling?.continuousPrecision === 'float32' ? Math.fround(value) : value
  const input =
    sampling?.keyToleranceUnit === 'parameter'
      ? (relation.points.find(
          (point) =>
            Math.abs(point.value - rounded) < (sampling.keyTolerance ?? DEFAULT_KEY_TOLERANCE),
        )?.value ?? rounded)
      : rounded
  const nextIndex = relation.points.findIndex((point) => point.value >= input)
  const next = relation.points[nextIndex]
  if (next === undefined) {
    return relation.points.at(-1)?.weight ?? 1
  }
  const previous = relation.points[nextIndex - 1]
  if (previous === undefined) {
    return next.weight
  }
  const progress = (input - previous.value) / (next.value - previous.value)
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
      weight = Math.min(weight, sampleInfluence(relation, value, options.binding.sampling))
    }
  }
  return weight
}
