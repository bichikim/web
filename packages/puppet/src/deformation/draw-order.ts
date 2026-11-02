import {getTargetBindings} from './target-bindings'
import {clamp} from 'es-toolkit/math'

import {
  PUPPET_DEFAULT_DRAW_ORDER,
  PUPPET_MAXIMUM_DRAW_ORDER,
  type PuppetDocument,
  type PuppetParameterBinding,
  type PuppetSceneGroupNode,
} from '../player/document'
import {getRepeatRanges} from '../player/parameter-value'
import {getParameterBindingValues, type PuppetParameterValueMap} from './composition'
import {getBindingInfluence} from './influence'
import {sampleParameterCoordinates} from './parameter'

const CUBISM_ORDER_TOLERANCE = 0.001

interface CreateDrawOrderSamplerOptions {
  /** Immutable targeting bindings, applied in document order. */
  readonly bindings: ReadonlyArray<PuppetParameterBinding>
  /** Immutable parameter ranges and draw-order rounding policies. */
  readonly document: PuppetDocument
  /** Keyed draw orders per keyform of a targeting binding; `undefined` keeps the rest value. */
  readonly keyed: (binding: PuppetParameterBinding) => ReadonlyArray<number | undefined> | undefined
  /** Unkeyed draw order and fallback for missing keyform channels. */
  readonly rest: number
}

/** Prepares immutable keyform channels and retains the latest draw-order input/result. */
const createDrawOrderSampler = (
  options: CreateDrawOrderSamplerOptions,
): ((values?: PuppetParameterValueMap) => number) => {
  const inputs = options.bindings.flatMap((binding) => {
    const keyed = options.keyed(binding)
    if (keyed === undefined) {
      return []
    }
    // Triangulated channels retain their weighted arithmetic even when all keys equal rest.
    const preservesConstant = binding.interpolation === 'grid' || binding.parameterIds.length === 1
    if (
      preservesConstant &&
      keyed.every((value) => value === undefined || value === options.rest)
    ) {
      return []
    }
    return [
      {binding, coordinates: keyed.map((value) => (value === undefined ? undefined : [value]))},
    ]
  })
  const parameterIds = [
    ...new Set(
      inputs.flatMap(({binding}) => [
        ...binding.parameterIds,
        ...(binding.influences ?? []).map((influence) => influence.parameterId),
      ]),
    ),
  ]
  let previousValues: ReadonlyArray<number | undefined> | undefined
  let previous: number | undefined
  return (parameterValues) => {
    if (
      previous !== undefined &&
      parameterIds.every((id, index) => Object.is(parameterValues?.[id], previousValues?.[index]))
    ) {
      return previous
    }
    const drawOrder = inputs.reduce((current, {binding, coordinates}) => {
      const [sampled = options.rest] = sampleParameterCoordinates({
        binding,
        keyformCoordinates: coordinates,
        repeatRanges: getRepeatRanges(binding.parameterIds, options.document.parameters),
        restCoordinates: [options.rest],
        values: getParameterBindingValues({binding, document: options.document, parameterValues}),
      })
      const weight = getBindingInfluence({binding, document: options.document, parameterValues})
      return current + (sampled - options.rest) * weight
    }, options.rest)
    const rounded =
      options.document.drawOrderRounding === 'cubism'
        ? Math.trunc(Math.fround(Math.fround(drawOrder) + CUBISM_ORDER_TOLERANCE))
        : drawOrder
    previousValues = parameterIds.map((id) => parameterValues?.[id])
    previous = clamp(rounded, 0, PUPPET_MAXIMUM_DRAW_ORDER)
    return previous
  }
}

const partSamplers = new WeakMap<
  PuppetDocument,
  Map<string, ReturnType<typeof createDrawOrderSampler>>
>()
const groupSamplers = new WeakMap<
  PuppetDocument,
  WeakMap<PuppetSceneGroupNode, ReturnType<typeof createDrawOrderSampler>>
>()

/** A part's draw order with its keyforms (`targetPartIds` bindings) applied. */
export const composeParameterPartDrawOrder = (
  document: PuppetDocument,
  partId: string,
  parameterValues?: PuppetParameterValueMap,
) => {
  let samplers = partSamplers.get(document)
  if (samplers === undefined) {
    samplers = new Map()
    partSamplers.set(document, samplers)
  }
  const previous = samplers.get(partId)
  if (previous !== undefined) {
    return previous(parameterValues)
  }
  const part = document.parts.find((candidate) => candidate.id === partId)
  const rest = part?.properties?.drawOrder ?? PUPPET_DEFAULT_DRAW_ORDER
  const sample = createDrawOrderSampler({
    bindings: getTargetBindings(document.parameterBindings ?? [], 'targetPartIds', partId),
    document,
    keyed: (binding) =>
      binding.targetPartIds?.includes(partId) === true
        ? binding.keyforms.map((keyform) => {
            const properties = keyform.parts.find((entry) => entry.partId === partId)?.properties
            return properties === undefined ? undefined : (properties.drawOrder ?? rest)
          })
        : undefined,
    rest,
  })
  if (part !== undefined) {
    samplers.set(partId, sample)
  }
  return sample(parameterValues)
}

/** A draw order group's draw order with its keyforms (`targetGroupIds` bindings) applied. */
export const composeParameterGroupDrawOrder = (
  document: PuppetDocument,
  group: PuppetSceneGroupNode,
  parameterValues?: PuppetParameterValueMap,
) => {
  let samplers = groupSamplers.get(document)
  if (samplers === undefined) {
    samplers = new WeakMap()
    groupSamplers.set(document, samplers)
  }
  const previous = samplers.get(group)
  if (previous !== undefined) {
    return previous(parameterValues)
  }
  const rest = group.properties?.drawOrder ?? PUPPET_DEFAULT_DRAW_ORDER
  const sample = createDrawOrderSampler({
    bindings: getTargetBindings(document.parameterBindings ?? [], 'targetGroupIds', group.id),
    document,
    keyed: (binding) =>
      binding.targetGroupIds?.includes(group.id) === true
        ? binding.keyforms.map((keyform) => {
            const properties = keyform.groups?.find(
              (entry) => entry.groupId === group.id,
            )?.properties
            return properties === undefined ? undefined : (properties.drawOrder ?? rest)
          })
        : undefined,
    rest,
  })
  samplers.set(group, sample)
  return sample(parameterValues)
}
