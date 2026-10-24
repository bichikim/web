import {clamp} from 'es-toolkit/math'
import {groupBy} from 'es-toolkit/array'
import type {PuppetDocument, PuppetGlue, PuppetParameterBinding} from '../player/document'
import {getParameterBindingValues, type PuppetParameterValueMap} from './composition'
import {getBindingInfluence} from './influence'
import {getRepeatRanges} from '../player/parameter-value'
import {getDirectGlueIds} from './get-direct-glue-ids'
import {
  type PuppetParameterValues,
  type PuppetRepeatRanges,
  sampleParameterCoordinates,
} from './parameter'

interface SampleGlueOptions {
  readonly binding: PuppetParameterBinding
  readonly glue: PuppetGlue
  readonly repeatRanges?: PuppetRepeatRanges
  readonly values: PuppetParameterValues
}

export const sampleParameterGlue = (options: SampleGlueOptions) => {
  const restCoordinates = [options.glue.weight, options.glue.strength]
  const coordinates = sampleParameterCoordinates({
    binding: options.binding,
    keyformCoordinates: options.binding.keyforms.map((keyform) => {
      const value =
        keyform.glue?.find((glue) => glue.id === options.glue.id) ??
        keyform.parts
          .find((part) => part.partId === options.glue.first.partId)
          ?.glue?.find((glue) => glue.id === options.glue.id)
      return value === undefined ? undefined : [value.weight, value.strength]
    }),
    repeatRanges: options.repeatRanges,
    restCoordinates,
    values: options.values,
  })
  return {id: options.glue.id, strength: coordinates[1]!, weight: coordinates[0]!}
}

interface ComposeGlueOptions {
  readonly document: PuppetDocument
  readonly parameterValues?: PuppetParameterValueMap
}

// 문서와 바인딩은 불변이다. 대상별 연결 목록은 파라미터 값이 바뀌어도 재사용한다.
const glueBindings = new WeakMap<
  ReadonlyArray<PuppetParameterBinding>,
  WeakMap<ReadonlyArray<PuppetGlue>, ReadonlyMap<PuppetGlue, ReadonlyArray<PuppetParameterBinding>>>
>()

const getGlueBindings = (
  bindings: ReadonlyArray<PuppetParameterBinding>,
  connections: ReadonlyArray<PuppetGlue>,
) => {
  let byConnections = glueBindings.get(bindings)
  if (byConnections === undefined) {
    byConnections = new WeakMap()
    glueBindings.set(bindings, byConnections)
  }
  const cached = byConnections.get(connections)
  if (cached !== undefined) {
    return cached
  }
  const byId = groupBy(connections, (glue) => glue.id)
  const byPart = groupBy(connections, (glue) => glue.first.partId)
  const indexed = new Map<PuppetGlue, PuppetParameterBinding[]>()
  for (const binding of bindings) {
    const partIds =
      binding.targetPartIds ??
      binding.keyforms.flatMap((form) => form.parts.map((part) => part.partId))
    const targets = new Set([
      ...getDirectGlueIds(binding).flatMap((id) => byId[id] ?? []),
      ...partIds.flatMap((id) => byPart[id] ?? []),
    ])
    for (const glue of targets) {
      const matching = indexed.get(glue) ?? []
      matching.push(binding)
      indexed.set(glue, matching)
    }
  }
  byConnections.set(connections, indexed)
  return indexed
}

export const composeParameterGlue = (options: ComposeGlueOptions): ReadonlyArray<PuppetGlue> => {
  const connections = options.document.glue ?? []
  if (connections.length === 0) {
    return connections
  }
  const matching = getGlueBindings(options.document.parameterBindings ?? [], connections)
  const evaluations = new Map<
    PuppetParameterBinding,
    {
      readonly influence: number
      readonly repeatRanges: PuppetRepeatRanges
      readonly values: PuppetParameterValues
    }
  >()
  const evaluate = (binding: PuppetParameterBinding) => {
    let result = evaluations.get(binding)
    if (result === undefined) {
      result = {
        influence: getBindingInfluence({...options, binding}),
        repeatRanges: getRepeatRanges(binding.parameterIds, options.document.parameters),
        values: getParameterBindingValues({...options, binding}),
      }
      evaluations.set(binding, result)
    }
    return result
  }
  return connections.map((glue) => {
    let {weight} = glue
    let {strength} = glue
    for (const binding of matching.get(glue) ?? []) {
      const {influence, ...evaluation} = evaluate(binding)
      const sampled = sampleParameterGlue({binding, glue, ...evaluation})
      weight += (sampled.weight - glue.weight) * influence
      strength += (sampled.strength - glue.strength) * influence
    }
    return {
      ...glue,
      strength: clamp(strength, 0, 1),
      weight: 'edge' in glue.second ? 1 : clamp(weight, 0, 1),
    }
  })
}
