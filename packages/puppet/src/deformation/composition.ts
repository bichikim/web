import {getParameterIndex} from '../player/parameter-index'
import {getBindingInfluence} from './influence'

import {
  MAX_PARAMETER_DIMENSIONS,
  type PuppetDocument,
  type PuppetParameter,
  type PuppetParameterBinding,
} from '../player/document'
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

const getParameterValue = (parameter: PuppetParameter | undefined, value: number | undefined) =>
  parameter === undefined ? 0 : resolveParameterValue(parameter, value)

export const getParameterBindingValueMap = (
  binding: PuppetParameterBinding,
  values: PuppetParameterValues,
): PuppetParameterValueMap =>
  Object.fromEntries(binding.parameterIds.map((id, index) => [id, values[index]]))

export const getDefaultParameterValueMap = (document: PuppetDocument): PuppetParameterValueMap =>
  Object.fromEntries(
    (document.parameters ?? []).map((parameter) => [parameter.id, parameter.defaultValue]),
  )

type BindingValueReader = (values: PuppetParameterValueMap | undefined) => PuppetParameterValues
interface BindingReaders {
  readonly axes: Map<string, BindingValueReader | undefined>
  readonly bindings: WeakMap<PuppetParameterBinding, BindingValueReader>
}
const readers = new WeakMap<PuppetDocument, BindingReaders>()

const createBindingReader = (
  document: PuppetDocument,
  binding: PuppetParameterBinding,
): BindingValueReader => {
  const parameters = getParameterIndex(document.parameters ?? [])
  const axes = isThreeDimensionalParameterBinding(binding)
    ? MAX_PARAMETER_DIMENSIONS
    : isTwoDimensionalParameterBinding(binding)
      ? 2
      : 1
  const first = parameters.get(binding.parameterIds[0])
  const second = axes >= 2 ? parameters.get(binding.parameterIds[1] ?? '') : undefined
  const third =
    axes === MAX_PARAMETER_DIMENSIONS ? parameters.get(binding.parameterIds[2] ?? '') : undefined
  let previousFirst: number | undefined
  let previousSecond: number | undefined
  let previousThird: number | undefined
  let sample: PuppetParameterValues | undefined
  return (values) => {
    const firstInput = first === undefined ? undefined : values?.[first.id]
    const secondInput = second === undefined ? undefined : values?.[second.id]
    const thirdInput = third === undefined ? undefined : values?.[third.id]
    if (
      sample !== undefined &&
      Object.is(firstInput, previousFirst) &&
      Object.is(secondInput, previousSecond) &&
      Object.is(thirdInput, previousThird)
    ) {
      return sample
    }
    const firstValue = getParameterValue(first, firstInput)
    switch (axes) {
      case 1:
        sample = [firstValue]
        break
      case 2:
        sample = [firstValue, getParameterValue(second, secondInput)]
        break
      case MAX_PARAMETER_DIMENSIONS:
        sample = [
          firstValue,
          getParameterValue(second, secondInput),
          getParameterValue(third, thirdInput),
        ]
        break
      default: {
        const exhaustive: never = axes
        throw new Error(`Unknown binding dimensions: ${exhaustive}`)
      }
    }
    previousFirst = firstInput
    previousSecond = secondInput
    previousThird = thirdInput
    return sample
  }
}

// Only the axes actually read define identity; caller serialization hooks do not.
const getBindingKey = (binding: PuppetParameterBinding): string => {
  const {parameterIds} = binding
  if (isThreeDimensionalParameterBinding(binding)) {
    return JSON.stringify([parameterIds[0], parameterIds[1], parameterIds[2]])
  }
  return JSON.stringify(
    isTwoDimensionalParameterBinding(binding)
      ? [parameterIds[0], parameterIds[1]]
      : [parameterIds[0]],
  )
}

const getBindingReader = (
  document: PuppetDocument,
  binding: PuppetParameterBinding,
): BindingValueReader => {
  let owner = readers.get(document)
  if (owner === undefined) {
    // Only declared model axes are held strongly; ad hoc bindings stay in the weak index.
    owner = {
      axes: new Map(
        (document.parameterBindings ?? []).map((entry) => [getBindingKey(entry), undefined]),
      ),
      bindings: new WeakMap(),
    }
    readers.set(document, owner)
  }
  let reader = owner.bindings.get(binding)
  if (reader === undefined) {
    const key = getBindingKey(binding)
    reader = owner.axes.get(key) ?? createBindingReader(document, binding)
    if (owner.axes.has(key)) {
      owner.axes.set(key, reader)
    }
    owner.bindings.set(binding, reader)
  }
  return reader
}

export const getParameterBindingValues = (
  options: GetParameterBindingValuesOptions,
): PuppetParameterValues =>
  getBindingReader(options.document, options.binding)(options.parameterValues)

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

interface VertexComposition {
  readonly bindings: ReadonlyArray<VertexBindingSample>
  readonly parameterIds: ReadonlyArray<string>
  readonly restVertices: ReadonlyArray<number>
  values?: ReadonlyArray<number | undefined>
  vertices: ReadonlyArray<number>
}

interface VertexBindingSample {
  readonly binding: PuppetParameterBinding
  readonly parameterIds: ReadonlyArray<string>
  values?: ReadonlyArray<number | undefined>
  vertices: ReadonlyArray<number>
  influence: number
}

const sampleVertexBinding = (
  options: ComposeParameterVerticesOptions,
  sample: VertexBindingSample,
): VertexBindingSample => {
  const previous = sample.values
  if (
    previous !== undefined &&
    sample.parameterIds.every((id, index) =>
      Object.is(previous[index], options.parameterValues?.[id]),
    )
  ) {
    return sample
  }
  const {binding} = sample
  sample.vertices = sampleParameterVertices({
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
  sample.influence = getBindingInfluence({
    binding,
    document: options.document,
    parameterValues: options.parameterValues,
  })
  sample.values = sample.parameterIds.map((id) => options.parameterValues?.[id])
  return sample
}

// Immutable documents retain only the latest part sample, including raw influence inputs.
const compositions = new WeakMap<PuppetDocument, Map<string, VertexComposition>>()

const getVertexComposition = (
  options: ComposeParameterVerticesOptions,
  bindings: ReadonlyArray<PuppetParameterBinding>,
): VertexComposition => {
  let parts = compositions.get(options.document)
  if (parts === undefined) {
    parts = new Map()
    compositions.set(options.document, parts)
  }
  let composition = parts.get(options.partId)
  if (composition === undefined || composition.restVertices !== options.restVertices) {
    const samples = bindings.map(
      (binding): VertexBindingSample => ({
        binding,
        influence: 1,
        parameterIds: [
          ...new Set([
            ...binding.parameterIds,
            ...(binding.influences ?? []).map((influence) => influence.parameterId),
          ]),
        ],
        vertices: options.restVertices,
      }),
    )
    composition = {
      bindings: samples,
      parameterIds: [...new Set(samples.flatMap((sample) => sample.parameterIds))],
      restVertices: options.restVertices,
      vertices: options.restVertices,
    }
    parts.set(options.partId, composition)
  }
  return composition
}

export const composeParameterVertices = (
  options: ComposeParameterVerticesOptions,
): ReadonlyArray<number> => {
  const bindings = getPartBindings(options.document.parameterBindings ?? [], options.partId)
  if (bindings.length === 0) {
    return options.restVertices
  }
  const composition = getVertexComposition(options, bindings)
  const previous = composition.values
  if (
    previous !== undefined &&
    composition.parameterIds.every((id, index) =>
      Object.is(previous[index], options.parameterValues?.[id]),
    )
  ) {
    return composition.vertices
  }
  const samples = composition.bindings
    .map((binding) => sampleVertexBinding(options, binding))
    .filter((sample) => sample.vertices !== options.restVertices)
  const composedVertices =
    samples.length === 0
      ? options.restVertices
      : options.restVertices.map((rest, index) => {
          let coordinate = rest
          for (const sample of samples) {
            coordinate += ((sample.vertices[index] ?? rest) - rest) * sample.influence
          }
          return coordinate
        })

  composition.values = composition.parameterIds.map((id) => options.parameterValues?.[id])
  composition.vertices = composedVertices
  return composedVertices
}
