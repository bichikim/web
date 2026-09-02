import {difference, union, uniq} from 'es-toolkit/array'

import {
  composeParameterVertices,
  isTwoDimensionalParameterBinding,
  parameterValuesEqual,
  type PuppetParameterValueMap,
  type PuppetParameterValues,
  sampleParameterVertices,
} from '../../deformation'
import type {
  PuppetDocument,
  PuppetParameter,
  PuppetParameterBinding,
  PuppetParameterBinding1D,
  PuppetParameterBinding2D,
  PuppetParameterKeyform,
  PuppetParameterPartKeyform,
} from '../../player/document'
import {movePartVertex} from '../edit-document'
import {createParameterBindingId, createParameterIds} from './parameter-id'

const COORDINATES_PER_VERTEX = 2
const DEFAULT_PARAMETER_MINIMUM = -30
const DEFAULT_PARAMETER_MAXIMUM = 30
const DEFAULT_PARAMETER_VALUE = 0
const TWO_DIMENSIONAL_VALUES = [
  DEFAULT_PARAMETER_MINIMUM,
  DEFAULT_PARAMETER_VALUE,
  DEFAULT_PARAMETER_MAXIMUM,
] as const

interface ParameterBindingTarget {
  readonly bindingId: string
  readonly document: PuppetDocument
}

interface ParameterValuesTarget extends ParameterBindingTarget {
  readonly values: PuppetParameterValues
}

export interface MoveParameterKeyformOptions extends ParameterValuesTarget {
  readonly nextValues: PuppetParameterValues
}

export interface SetParameterKeyformVertexOptions extends ParameterValuesTarget {
  readonly partId: string
  readonly vertexIndex: number
  readonly x: number
  readonly y: number
}

export interface AddParameterOptions {
  readonly document: PuppetDocument
  readonly partIds: ReadonlyArray<string>
}

export interface AddParameterResult {
  readonly binding: PuppetParameterBinding
  readonly document: PuppetDocument
}

export const getDocumentParameters = (document: PuppetDocument) => document.parameters ?? []

export const getDocumentParameterBindings = (document: PuppetDocument) =>
  document.parameterBindings ?? []

export const getParameterBinding = (document: PuppetDocument, bindingId: string) =>
  getDocumentParameterBindings(document).find((binding) => binding.id === bindingId)

export const getBindingParameters = (document: PuppetDocument, binding: PuppetParameterBinding) => {
  const parameterById = new Map(
    getDocumentParameters(document).map((parameter) => [parameter.id, parameter]),
  )
  return binding.parameterIds.flatMap((parameterId) => {
    const parameter = parameterById.get(parameterId)
    return parameter === undefined ? [] : [parameter]
  })
}

export const getParameterTargetPartIds = (binding: PuppetParameterBinding) => {
  if (binding.targetPartIds !== undefined) {
    return binding.targetPartIds
  }

  return uniq(binding.keyforms.flatMap((keyform) => keyform.parts.map((part) => part.partId)))
}

export const getDefaultParameterValues = (
  document: PuppetDocument,
  binding: PuppetParameterBinding | undefined,
): PuppetParameterValues => {
  const parameters = binding === undefined ? [] : getBindingParameters(document, binding)
  return binding !== undefined && isTwoDimensionalParameterBinding(binding)
    ? [parameters[0]?.defaultValue ?? 0, parameters[1]?.defaultValue ?? 0]
    : [parameters[0]?.defaultValue ?? 0]
}

const getDocumentParts = (document: PuppetDocument, partIds: ReadonlyArray<string>) => {
  const selectedPartIds = new Set(partIds)
  return document.parts.filter((part) => selectedPartIds.has(part.id))
}

const getPartVertices = (
  keyform: PuppetParameterKeyform,
  partId: string,
  restVertices: ReadonlyArray<number>,
) => keyform.parts.find((part) => part.partId === partId)?.vertices ?? restVertices

const replaceBinding = (
  document: PuppetDocument,
  bindingId: string,
  update: (binding: PuppetParameterBinding) => PuppetParameterBinding,
): PuppetDocument | undefined => {
  const bindings = getDocumentParameterBindings(document)
  if (!bindings.some((binding) => binding.id === bindingId)) {
    return undefined
  }

  return {
    ...document,
    parameterBindings: bindings.map((binding) =>
      binding.id === bindingId ? update(binding) : binding,
    ),
  }
}

const createParameter = (id: string, name: string): PuppetParameter => ({
  defaultValue: DEFAULT_PARAMETER_VALUE,
  id,
  maximum: DEFAULT_PARAMETER_MAXIMUM,
  minimum: DEFAULT_PARAMETER_MINIMUM,
  name,
})

export const addParameter = (options: AddParameterOptions): AddParameterResult | undefined => {
  const parts = getDocumentParts(options.document, options.partIds)
  if (parts.length === 0) {
    return undefined
  }

  const {ids, index} = createParameterIds(options.document, 1)
  const id = ids[0]!
  const parameter = createParameter(id, `Parameter ${index}`)
  const binding: PuppetParameterBinding1D = {
    id,
    keyforms: [
      {
        parts: parts.map((part) => ({partId: part.id, vertices: part.mesh.vertices})),
        values: [DEFAULT_PARAMETER_VALUE],
      },
    ],
    parameterIds: [id],
    targetPartIds: parts.map((part) => part.id),
  }

  return {
    binding,
    document: {
      ...options.document,
      parameterBindings: [...getDocumentParameterBindings(options.document), binding],
      parameters: [...getDocumentParameters(options.document), parameter],
    },
  }
}

export const addTwoDimensionalParameter = (
  options: AddParameterOptions,
): AddParameterResult | undefined => {
  const parts = getDocumentParts(options.document, options.partIds)
  if (parts.length === 0) {
    return undefined
  }

  const {ids, index} = createParameterIds(options.document, 2)
  const xId = ids[0]!
  const yId = ids[1]!
  const bindingId = createParameterBindingId(options.document, `${xId}-${yId}`)
  const parameters = [
    createParameter(xId, `Parameter ${index} X`),
    createParameter(yId, `Parameter ${index} Y`),
  ]
  const binding: PuppetParameterBinding2D = {
    id: bindingId,
    keyforms: TWO_DIMENSIONAL_VALUES.flatMap((y) =>
      TWO_DIMENSIONAL_VALUES.map((x) => ({
        parts: parts.map((part) => ({partId: part.id, vertices: part.mesh.vertices})),
        values: [x, y] as const,
      })),
    ),
    parameterIds: [xId, yId],
    targetPartIds: parts.map((part) => part.id),
  }

  return {
    binding,
    document: {
      ...options.document,
      parameterBindings: [...getDocumentParameterBindings(options.document), binding],
      parameters: [...getDocumentParameters(options.document), ...parameters],
    },
  }
}

export const renameParameter = (
  options: ParameterBindingTarget & {readonly name: string; readonly parameterId?: string},
) => {
  const name = options.name.trim()
  const binding = getParameterBinding(options.document, options.bindingId)
  const parameterId = options.parameterId ?? binding?.parameterIds[0]
  if (name.length === 0 || parameterId === undefined) {
    return undefined
  }

  return {
    ...options.document,
    parameters: getDocumentParameters(options.document).map((parameter) =>
      parameter.id === parameterId ? {...parameter, name} : parameter,
    ),
  }
}

export const deleteParameter = (options: ParameterBindingTarget): PuppetDocument | undefined => {
  const binding = getParameterBinding(options.document, options.bindingId)
  if (binding === undefined) {
    return undefined
  }

  const remainingBindings = getDocumentParameterBindings(options.document).filter(
    (candidate) => candidate.id !== binding.id,
  )
  const retainedParameterIds = new Set(
    remainingBindings.flatMap((candidate) => candidate.parameterIds),
  )
  const removedParameterIds = new Set(
    binding.parameterIds.filter((parameterId) => !retainedParameterIds.has(parameterId)),
  )
  return {
    ...options.document,
    parameterBindings: remainingBindings,
    parameters: getDocumentParameters(options.document).filter(
      (parameter) => !removedParameterIds.has(parameter.id),
    ),
  }
}

export const insertParameterKeyform = (options: ParameterValuesTarget) => {
  const binding = getParameterBinding(options.document, options.bindingId)
  const parameters = binding === undefined ? [] : getBindingParameters(options.document, binding)
  const parts =
    binding === undefined
      ? []
      : getDocumentParts(options.document, getParameterTargetPartIds(binding))

  if (
    binding === undefined ||
    parts.length === 0 ||
    options.values.length !== binding.parameterIds.length ||
    parameters.length !== binding.parameterIds.length ||
    binding.keyforms.some((keyform) => parameterValuesEqual(keyform.values, options.values)) ||
    options.values.some((value, index) => {
      const parameter = parameters[index]
      return parameter === undefined || value < parameter.minimum || value > parameter.maximum
    })
  ) {
    return undefined
  }

  const partsKeyforms = parts.map((part) => ({
    partId: part.id,
    vertices: sampleParameterVertices({
      binding,
      partId: part.id,
      restVertices: part.mesh.vertices,
      values: options.values,
    }),
  }))

  return replaceBinding(options.document, options.bindingId, (candidate) => {
    if (isTwoDimensionalParameterBinding(candidate)) {
      const [x, y] = options.values
      if (x === undefined || y === undefined) {
        return candidate
      }

      const keyform = {parts: partsKeyforms, values: [x, y] as const}
      return {
        ...candidate,
        keyforms: [...candidate.keyforms, keyform].sort(
          (first, second) =>
            first.values[1] - second.values[1] || first.values[0] - second.values[0],
        ),
      }
    }

    const [value] = options.values
    if (value === undefined) {
      return candidate
    }

    const keyform = {
      parts: partsKeyforms,
      values: [value] as const,
    }

    return {
      ...candidate,
      keyforms: [...candidate.keyforms, keyform].sort(
        (first, second) => first.values[0] - second.values[0],
      ),
    }
  })
}

export const deleteParameterKeyform = (options: ParameterValuesTarget) =>
  replaceBinding(options.document, options.bindingId, (binding) => {
    if (options.values.length !== binding.parameterIds.length) {
      return binding
    }

    return {
      ...binding,
      keyforms: binding.keyforms.filter(
        (keyform) => !parameterValuesEqual(keyform.values, options.values),
      ),
    } as PuppetParameterBinding
  })

const synchronizeKeyformParts = (
  keyform: PuppetParameterKeyform,
  parts: ReadonlyArray<PuppetDocument['parts'][number]>,
) =>
  parts.map(
    (part) =>
      keyform.parts.find((partKeyform) => partKeyform.partId === part.id) ?? {
        partId: part.id,
        vertices: part.mesh.vertices,
      },
  )

const synchronizeBindingParts = (
  binding: PuppetParameterBinding,
  parts: ReadonlyArray<PuppetDocument['parts'][number]>,
): PuppetParameterBinding => {
  if (isTwoDimensionalParameterBinding(binding)) {
    return {
      ...binding,
      keyforms: binding.keyforms.map((keyform) => ({
        ...keyform,
        parts: synchronizeKeyformParts(keyform, parts),
      })),
      targetPartIds: parts.map((part) => part.id),
    }
  }

  return {
    ...binding,
    keyforms: binding.keyforms.map((keyform) => ({
      ...keyform,
      parts: synchronizeKeyformParts(keyform, parts),
    })),
    targetPartIds: parts.map((part) => part.id),
  }
}

interface UpdateParameterTargetsOptions extends ParameterBindingTarget {
  readonly partIds: ReadonlyArray<string>
}

export const connectParameterParts = (options: UpdateParameterTargetsOptions) => {
  const binding = getParameterBinding(options.document, options.bindingId)
  if (binding === undefined) {
    return undefined
  }

  const requestedParts = getDocumentParts(options.document, options.partIds)
  const targetPartIds = union(
    getParameterTargetPartIds(binding),
    requestedParts.map((part) => part.id),
  )
  const parts = getDocumentParts(options.document, targetPartIds)
  if (parts.length === getParameterTargetPartIds(binding).length) {
    return undefined
  }

  return replaceBinding(options.document, binding.id, (candidate) =>
    synchronizeBindingParts(candidate, parts),
  )
}

export const disconnectParameterParts = (options: UpdateParameterTargetsOptions) => {
  const binding = getParameterBinding(options.document, options.bindingId)
  if (binding === undefined) {
    return undefined
  }

  const parts = getDocumentParts(
    options.document,
    difference(getParameterTargetPartIds(binding), options.partIds),
  )
  if (parts.length === getParameterTargetPartIds(binding).length) {
    return undefined
  }

  const targetPartIds = new Set(parts.map((part) => part.id))
  return replaceBinding(options.document, binding.id, (candidate) => {
    if (isTwoDimensionalParameterBinding(candidate)) {
      return {
        ...candidate,
        keyforms: candidate.keyforms.map((keyform) => ({
          ...keyform,
          parts: keyform.parts.filter((part) => targetPartIds.has(part.partId)),
        })),
        targetPartIds: parts.map((part) => part.id),
      }
    }

    return {
      ...candidate,
      keyforms: candidate.keyforms.map((keyform) => ({
        ...keyform,
        parts: keyform.parts.filter((part) => targetPartIds.has(part.partId)),
      })),
      targetPartIds: parts.map((part) => part.id),
    }
  })
}

export const moveParameterKeyform = (options: MoveParameterKeyformOptions) => {
  const binding = getParameterBinding(options.document, options.bindingId)
  const parameters = binding === undefined ? [] : getBindingParameters(options.document, binding)

  if (
    binding === undefined ||
    options.values.length !== binding.parameterIds.length ||
    options.nextValues.length !== binding.parameterIds.length ||
    !binding.keyforms.some((keyform) => parameterValuesEqual(keyform.values, options.values)) ||
    binding.keyforms.some(
      (keyform) =>
        !parameterValuesEqual(keyform.values, options.values) &&
        parameterValuesEqual(keyform.values, options.nextValues),
    ) ||
    options.nextValues.some((value, index) => {
      const parameter = parameters[index]
      return (
        parameter === undefined ||
        !Number.isFinite(value) ||
        value < parameter.minimum ||
        value > parameter.maximum
      )
    })
  ) {
    return undefined
  }

  if (parameterValuesEqual(options.nextValues, options.values)) {
    return options.document
  }

  return replaceBinding(options.document, options.bindingId, (candidate) => {
    if (isTwoDimensionalParameterBinding(candidate)) {
      const [x, y] = options.nextValues
      if (x === undefined || y === undefined) {
        return candidate
      }

      return {
        ...candidate,
        keyforms: candidate.keyforms
          .map((keyform) =>
            parameterValuesEqual(keyform.values, options.values)
              ? {...keyform, values: [x, y] as const}
              : keyform,
          )
          .sort(
            (first, second) =>
              first.values[1] - second.values[1] || first.values[0] - second.values[0],
          ),
      }
    }

    const [value] = options.nextValues
    if (value === undefined) {
      return candidate
    }

    return {
      ...candidate,
      keyforms: candidate.keyforms
        .map((keyform) =>
          parameterValuesEqual(keyform.values, options.values)
            ? {...keyform, values: [value] as const}
            : keyform,
        )
        .sort((first, second) => first.values[0] - second.values[0]),
    }
  })
}

const replacePartKeyform = (
  parts: ReadonlyArray<PuppetParameterPartKeyform>,
  part: PuppetParameterPartKeyform,
) =>
  parts.some((candidate) => candidate.partId === part.partId)
    ? parts.map((candidate) => (candidate.partId === part.partId ? part : candidate))
    : [...parts, part]

export const setParameterKeyformVertex = (options: SetParameterKeyformVertexOptions) => {
  const binding = getParameterBinding(options.document, options.bindingId)
  const keyform = binding?.keyforms.find(
    (candidate) =>
      candidate.values.length === options.values.length &&
      candidate.values.every((value, index) => value === options.values[index]),
  )
  const part = options.document.parts.find((candidate) => candidate.id === options.partId)

  if (binding === undefined || keyform === undefined || part === undefined) {
    return undefined
  }

  if (!getParameterTargetPartIds(binding).includes(part.id)) {
    return undefined
  }

  const vertices = [...getPartVertices(keyform, part.id, part.mesh.vertices)]
  const coordinateIndex = options.vertexIndex * COORDINATES_PER_VERTEX
  vertices[coordinateIndex] = options.x
  vertices[coordinateIndex + 1] = options.y
  const validationDocument = {
    ...options.document,
    parts: options.document.parts.map((candidate) =>
      candidate.id === part.id ? {...candidate, mesh: {...candidate.mesh, vertices}} : candidate,
    ),
  }
  const validation = movePartVertex({
    document: validationDocument,
    partId: part.id,
    vertexIndex: options.vertexIndex,
    x: options.x,
    y: options.y,
  })

  if (!validation.ok) {
    return undefined
  }

  return replaceBinding(options.document, binding.id, (candidate) => {
    const replaceKeyform = <Keyform extends PuppetParameterKeyform>(
      candidateKeyform: Keyform,
    ): Keyform =>
      candidateKeyform.values.length === keyform.values.length &&
      candidateKeyform.values.every((value, index) => value === keyform.values[index])
        ? {
            ...candidateKeyform,
            parts: replacePartKeyform(candidateKeyform.parts, {partId: part.id, vertices}),
          }
        : candidateKeyform

    if (isTwoDimensionalParameterBinding(candidate)) {
      return {...candidate, keyforms: candidate.keyforms.map(replaceKeyform)}
    }

    return {...candidate, keyforms: candidate.keyforms.map(replaceKeyform)}
  })
}

export interface CreateParameterPreviewOptions {
  readonly document: PuppetDocument
  readonly parameterValues?: PuppetParameterValueMap
}

export const createParameterPreview = (options: CreateParameterPreviewOptions): PuppetDocument => ({
  ...options.document,
  motions: [],
  parameterBindings: [],
  parameters: [],
  parts: options.document.parts.map((part) => ({
    ...part,
    mesh: {
      ...part.mesh,
      vertices: composeParameterVertices({
        document: options.document,
        parameterValues: options.parameterValues,
        partId: part.id,
        restVertices: part.mesh.vertices,
      }),
    },
  })),
})

export {sampleParameterVertices}
