import {getParameterIndex} from '../player/parameter-index'
import {getBindingInfluence} from './influence'

import type {PuppetDocument, PuppetParameter, PuppetParameterBinding} from '../player/document'
import {getRepeatRanges, resolveParameterValue} from '../player/parameter-value'
import {
  isThreeDimensionalParameterBinding,
  isTwoDimensionalParameterBinding,
  type PuppetParameterValues,
  sampleParameterVertices,
} from './parameter'

export type PuppetParameterValueMap = Readonly<Record<string, number>>

export interface GetParameterBindingValuesOptions {
  readonly binding: PuppetParameterBinding
  readonly document: PuppetDocument
  readonly parameterValues?: PuppetParameterValueMap
}

export interface ComposeParameterVerticesOptions {
  readonly document: PuppetDocument
  readonly parameterValues?: PuppetParameterValueMap
  readonly partId: string
  readonly restVertices: ReadonlyArray<number>
}

const getParameterValue = (
  parameter: PuppetParameter | undefined,
  parameterValues: PuppetParameterValueMap | undefined,
) => {
  return parameter === undefined
    ? 0
    : resolveParameterValue(parameter, parameterValues?.[parameter.id])
}

export const getParameterBindingValueMap = (
  binding: PuppetParameterBinding,
  values: PuppetParameterValues,
): PuppetParameterValueMap =>
  Object.fromEntries(binding.parameterIds.map((id, index) => [id, values[index]]))

export const getDefaultParameterValueMap = (document: PuppetDocument): PuppetParameterValueMap =>
  Object.fromEntries(
    (document.parameters ?? []).map((parameter) => [parameter.id, parameter.defaultValue]),
  )

export const getParameterBindingValues = (
  options: GetParameterBindingValuesOptions,
): PuppetParameterValues => {
  const parameterById = getParameterIndex(options.document.parameters ?? [])
  const firstValue = getParameterValue(
    parameterById.get(options.binding.parameterIds[0]),
    options.parameterValues,
  )

  const valueAt = (index: number) =>
    getParameterValue(
      parameterById.get(options.binding.parameterIds[index] ?? ''),
      options.parameterValues,
    )
  if (isThreeDimensionalParameterBinding(options.binding)) {
    return [firstValue, valueAt(1), valueAt(2)]
  }
  if (!isTwoDimensionalParameterBinding(options.binding)) {
    return [firstValue]
  }

  return [firstValue, valueAt(1)]
}

const addParameterDelta = (
  currentVertices: ReadonlyArray<number>,
  sampledVertices: ReadonlyArray<number>,
  restVertices: ReadonlyArray<number>,
  weight: number,
) =>
  restVertices.map((restCoordinate, index) => {
    const currentCoordinate = currentVertices[index] ?? restCoordinate
    const sampledCoordinate = sampledVertices[index] ?? restCoordinate
    return currentCoordinate + (sampledCoordinate - restCoordinate) * weight
  })

const bindingsByPart = new WeakMap<
  ReadonlyArray<PuppetParameterBinding>,
  Map<string, PuppetParameterBinding[]>
>()

const getPartBindings = (
  bindings: ReadonlyArray<PuppetParameterBinding>,
  partId: string,
): ReadonlyArray<PuppetParameterBinding> => {
  let indexed = bindingsByPart.get(bindings)
  if (indexed === undefined) {
    indexed = new Map()
    for (const binding of bindings) {
      const partIds = new Set(
        binding.targetPartIds ??
          binding.keyforms.flatMap((keyform) => keyform.parts.map((part) => part.partId)),
      )
      for (const targetId of partIds) {
        if (
          binding.keyforms.some((form) =>
            form.parts.some((part) => part.partId === targetId && part.vertices.length > 0),
          )
        ) {
          const partBindings = indexed.get(targetId) ?? []
          partBindings.push(binding)
          indexed.set(targetId, partBindings)
        }
      }
    }
    bindingsByPart.set(bindings, indexed)
  }

  return indexed.get(partId) ?? []
}

export const composeParameterVertices = (
  options: ComposeParameterVerticesOptions,
): ReadonlyArray<number> => {
  let composedVertices = options.restVertices

  for (const binding of getPartBindings(options.document.parameterBindings ?? [], options.partId)) {
    const sampledVertices = sampleParameterVertices({
      binding,
      partId: options.partId,
      repeatRanges: getRepeatRanges(binding.parameterIds, options.document.parameters),
      restVertices: options.restVertices,
      values: getParameterBindingValues({
        binding,
        document: options.document,
        parameterValues: options.parameterValues,
      }),
    })

    if (sampledVertices !== options.restVertices) {
      composedVertices = addParameterDelta(
        composedVertices,
        sampledVertices,
        options.restVertices,
        getBindingInfluence({
          binding,
          document: options.document,
          parameterValues: options.parameterValues,
        }),
      )
    }
  }

  return composedVertices
}
