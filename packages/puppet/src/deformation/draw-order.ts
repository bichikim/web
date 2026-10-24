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

interface ComposeKeyedDrawOrderOptions {
  readonly document: PuppetDocument
  /** Keyed draw orders per keyform of a targeting binding; `undefined` keeps the rest value. */
  readonly keyed: (binding: PuppetParameterBinding) => ReadonlyArray<number | undefined> | undefined
  readonly parameterValues?: PuppetParameterValueMap
  readonly rest: number
}

/**
 * The rest draw order moved by every targeting binding's sampled keyform offset, weighted by
 * its influence (as opacity is), within 0..1000.
 */
const composeKeyedDrawOrder = (options: ComposeKeyedDrawOrderOptions) => {
  const drawOrder = (options.document.parameterBindings ?? []).reduce((current, binding) => {
    const keyed = options.keyed(binding)
    if (keyed === undefined) {
      return current
    }
    const [sampled = options.rest] = sampleParameterCoordinates({
      binding,
      keyformCoordinates: keyed.map((value) => (value === undefined ? undefined : [value])),
      repeatRanges: getRepeatRanges(binding.parameterIds, options.document.parameters),
      restCoordinates: [options.rest],
      values: getParameterBindingValues({
        binding,
        document: options.document,
        parameterValues: options.parameterValues,
      }),
    })
    const weight = getBindingInfluence({
      binding,
      document: options.document,
      parameterValues: options.parameterValues,
    })
    return current + (sampled - options.rest) * weight
  }, options.rest)
  const rounded =
    options.document.drawOrderRounding === 'cubism'
      ? Math.trunc(Math.fround(Math.fround(drawOrder) + CUBISM_ORDER_TOLERANCE))
      : drawOrder
  return clamp(rounded, 0, PUPPET_MAXIMUM_DRAW_ORDER)
}

/** A part's draw order with its keyforms (`targetPartIds` bindings) applied. */
export const composeParameterPartDrawOrder = (
  document: PuppetDocument,
  partId: string,
  parameterValues?: PuppetParameterValueMap,
) => {
  const part = document.parts.find((candidate) => candidate.id === partId)
  const rest = part?.properties?.drawOrder ?? PUPPET_DEFAULT_DRAW_ORDER
  return composeKeyedDrawOrder({
    document,
    keyed: (binding) =>
      binding.targetPartIds?.includes(partId) === true
        ? binding.keyforms.map((keyform) => {
            const properties = keyform.parts.find((entry) => entry.partId === partId)?.properties
            return properties === undefined ? undefined : (properties.drawOrder ?? rest)
          })
        : undefined,
    parameterValues,
    rest,
  })
}

/** A draw order group's draw order with its keyforms (`targetGroupIds` bindings) applied. */
export const composeParameterGroupDrawOrder = (
  document: PuppetDocument,
  group: PuppetSceneGroupNode,
  parameterValues?: PuppetParameterValueMap,
) => {
  const rest = group.properties?.drawOrder ?? PUPPET_DEFAULT_DRAW_ORDER
  return composeKeyedDrawOrder({
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
    parameterValues,
    rest,
  })
}
