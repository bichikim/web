import {getBindingInfluence} from './influence'

import type {PuppetDocument, PuppetParameter, PuppetParameterBinding} from '../player/document'
import {resolveParameterValue} from '../player/parameter-value'
import {
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

export const getDefaultParameterValueMap = (document: PuppetDocument): PuppetParameterValueMap =>
  Object.fromEntries(
    (document.parameters ?? []).map((parameter) => [parameter.id, parameter.defaultValue]),
  )

export const getParameterBindingValues = (
  options: GetParameterBindingValuesOptions,
): PuppetParameterValues => {
  const parameterById = new Map(
    (options.document.parameters ?? []).map((parameter) => [parameter.id, parameter]),
  )
  const firstValue = getParameterValue(
    parameterById.get(options.binding.parameterIds[0]),
    options.parameterValues,
  )

  if (!isTwoDimensionalParameterBinding(options.binding)) {
    return [firstValue]
  }

  return [
    firstValue,
    getParameterValue(parameterById.get(options.binding.parameterIds[1]), options.parameterValues),
  ]
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

export const composeParameterVertices = (
  options: ComposeParameterVerticesOptions,
): ReadonlyArray<number> => {
  let composedVertices = options.restVertices

  for (const binding of options.document.parameterBindings ?? []) {
    const sampledVertices = sampleParameterVertices({
      binding,
      partId: options.partId,
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
