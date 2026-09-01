import {difference, sortBy, union, uniq} from 'es-toolkit/array'

import type {
  PuppetDocument,
  PuppetParameter,
  PuppetParameterKeyform,
  PuppetParameterPartKeyform,
} from '../../player/document'
import {movePartVertex} from '../edit-document'

const COORDINATES_PER_VERTEX = 2
const DEFAULT_PARAMETER_MINIMUM = -30
const DEFAULT_PARAMETER_MAXIMUM = 30
const DEFAULT_PARAMETER_VALUE = 0

interface ParameterTarget {
  readonly document: PuppetDocument
  readonly parameterId: string
}

interface ParameterValueTarget extends ParameterTarget {
  readonly value: number
}

export interface MoveParameterKeyformOptions extends ParameterValueTarget {
  readonly nextValue: number
}

interface PartParameterValueTarget extends ParameterValueTarget {
  readonly partId: string
}

export interface SetParameterKeyformVertexOptions extends PartParameterValueTarget {
  readonly vertexIndex: number
  readonly x: number
  readonly y: number
}

export interface AddParameterOptions {
  readonly document: PuppetDocument
  readonly partIds: ReadonlyArray<string>
}

export const getDocumentParameters = (document: PuppetDocument) => document.parameters ?? []

export const getParameterTargetPartIds = (parameter: PuppetParameter) => {
  if (parameter.targetPartIds !== undefined) {
    return parameter.targetPartIds
  }

  return uniq(parameter.keyforms.flatMap((keyform) => keyform.parts.map((part) => part.partId)))
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

const interpolateVertices = (
  first: ReadonlyArray<number>,
  second: ReadonlyArray<number>,
  progress: number,
) =>
  first.map(
    (coordinate, index) => coordinate + ((second[index] ?? coordinate) - coordinate) * progress,
  )

export interface SampleParameterVerticesOptions {
  readonly parameter?: PuppetParameter
  readonly partId: string
  readonly restVertices: ReadonlyArray<number>
  readonly value: number
}

export const sampleParameterVertices = (options: SampleParameterVerticesOptions) => {
  const keyforms = options.parameter?.keyforms ?? []

  if (keyforms.length === 0) {
    return options.restVertices
  }

  const nextIndex = keyforms.findIndex((keyform) => keyform.value >= options.value)

  if (nextIndex === -1) {
    return getPartVertices(keyforms.at(-1)!, options.partId, options.restVertices)
  }

  const nextKeyform = keyforms[nextIndex]

  if (nextIndex === 0 || nextKeyform === undefined) {
    return getPartVertices(keyforms[0]!, options.partId, options.restVertices)
  }

  const previousKeyform = keyforms[nextIndex - 1]

  if (previousKeyform === undefined) {
    return options.restVertices
  }

  const range = nextKeyform.value - previousKeyform.value
  const progress = range === 0 ? 0 : (options.value - previousKeyform.value) / range

  return interpolateVertices(
    getPartVertices(previousKeyform, options.partId, options.restVertices),
    getPartVertices(nextKeyform, options.partId, options.restVertices),
    progress,
  )
}

const replaceParameter = (
  document: PuppetDocument,
  parameterId: string,
  update: (parameter: PuppetParameter) => PuppetParameter,
): PuppetDocument | undefined => {
  const parameters = getDocumentParameters(document)

  if (!parameters.some((parameter) => parameter.id === parameterId)) {
    return undefined
  }

  return {
    ...document,
    parameters: parameters.map((parameter) =>
      parameter.id === parameterId ? update(parameter) : parameter,
    ),
  }
}

const createParameterId = (document: PuppetDocument) => {
  const ids = new Set(getDocumentParameters(document).map((parameter) => parameter.id))
  let index = ids.size + 1
  let id = `parameter-${index}`

  while (ids.has(id)) {
    index += 1
    id = `parameter-${index}`
  }

  return {id, index}
}

export const addParameter = (options: AddParameterOptions) => {
  const parts = getDocumentParts(options.document, options.partIds)

  if (parts.length === 0) {
    return undefined
  }

  const {id, index} = createParameterId(options.document)
  const parameter: PuppetParameter = {
    defaultValue: DEFAULT_PARAMETER_VALUE,
    id,
    keyforms: [
      {
        parts: parts.map((part) => ({partId: part.id, vertices: part.mesh.vertices})),
        value: DEFAULT_PARAMETER_VALUE,
      },
    ],
    maximum: DEFAULT_PARAMETER_MAXIMUM,
    minimum: DEFAULT_PARAMETER_MINIMUM,
    name: `Parameter ${index}`,
    targetPartIds: parts.map((part) => part.id),
  }

  return {
    document: {
      ...options.document,
      parameters: [...getDocumentParameters(options.document), parameter],
    },
    parameter,
  }
}

export const renameParameter = (options: ParameterTarget & {readonly name: string}) => {
  const name = options.name.trim()

  if (name.length === 0) {
    return undefined
  }

  return replaceParameter(options.document, options.parameterId, (parameter) => ({
    ...parameter,
    name,
  }))
}

export const deleteParameter = (options: ParameterTarget): PuppetDocument | undefined => {
  const parameters = getDocumentParameters(options.document)

  if (!parameters.some((parameter) => parameter.id === options.parameterId)) {
    return undefined
  }

  return {
    ...options.document,
    parameters: parameters.filter((parameter) => parameter.id !== options.parameterId),
  }
}

export const insertParameterKeyform = (options: ParameterValueTarget) => {
  const parameter = getDocumentParameters(options.document).find(
    (candidate) => candidate.id === options.parameterId,
  )
  const parts =
    parameter === undefined
      ? []
      : getDocumentParts(options.document, getParameterTargetPartIds(parameter))

  if (
    parameter === undefined ||
    parts.length === 0 ||
    options.value < parameter.minimum ||
    options.value > parameter.maximum ||
    parameter.keyforms.some((keyform) => keyform.value === options.value)
  ) {
    return undefined
  }

  const keyform: PuppetParameterKeyform = {
    parts: parts.map((part) => ({
      partId: part.id,
      vertices: sampleParameterVertices({
        parameter,
        partId: part.id,
        restVertices: part.mesh.vertices,
        value: options.value,
      }),
    })),
    value: options.value,
  }

  return replaceParameter(options.document, options.parameterId, (candidate) => ({
    ...candidate,
    keyforms: sortBy([...candidate.keyforms, keyform], ['value']),
  }))
}

export const deleteParameterKeyform = (options: ParameterValueTarget) =>
  replaceParameter(options.document, options.parameterId, (parameter) => ({
    ...parameter,
    keyforms: parameter.keyforms.filter((keyform) => keyform.value !== options.value),
  }))

export const moveParameterKeyform = (options: MoveParameterKeyformOptions) => {
  const parameter = getDocumentParameters(options.document).find(
    (candidate) => candidate.id === options.parameterId,
  )
  const keyform = parameter?.keyforms.find((candidate) => candidate.value === options.value)

  if (
    parameter === undefined ||
    keyform === undefined ||
    !Number.isFinite(options.nextValue) ||
    options.nextValue < parameter.minimum ||
    options.nextValue > parameter.maximum ||
    parameter.keyforms.some(
      (candidate) => candidate.value !== options.value && candidate.value === options.nextValue,
    )
  ) {
    return undefined
  }

  if (options.nextValue === options.value) {
    return options.document
  }

  return replaceParameter(options.document, options.parameterId, (candidate) => ({
    ...candidate,
    keyforms: sortBy(
      candidate.keyforms.map((candidateKeyform) =>
        candidateKeyform.value === options.value
          ? {...candidateKeyform, value: options.nextValue}
          : candidateKeyform,
      ),
      ['value'],
    ),
  }))
}

const replacePartKeyform = (
  parts: ReadonlyArray<PuppetParameterPartKeyform>,
  part: PuppetParameterPartKeyform,
) =>
  parts.some((candidate) => candidate.partId === part.partId)
    ? parts.map((candidate) => (candidate.partId === part.partId ? part : candidate))
    : [...parts, part]

interface UpdateParameterTargetsOptions extends ParameterTarget {
  readonly partIds: ReadonlyArray<string>
}

const synchronizeKeyformParts = (
  keyform: PuppetParameterKeyform,
  parts: ReadonlyArray<PuppetDocument['parts'][number]>,
): PuppetParameterKeyform => ({
  ...keyform,
  parts: parts.map(
    (part) =>
      keyform.parts.find((partKeyform) => partKeyform.partId === part.id) ?? {
        partId: part.id,
        vertices: part.mesh.vertices,
      },
  ),
})

export const connectParameterParts = (options: UpdateParameterTargetsOptions) => {
  const parameter = getDocumentParameters(options.document).find(
    (candidate) => candidate.id === options.parameterId,
  )

  if (parameter === undefined) {
    return undefined
  }

  const requestedParts = getDocumentParts(options.document, options.partIds)
  const targetPartIds = union(
    getParameterTargetPartIds(parameter),
    requestedParts.map((part) => part.id),
  )
  const parts = getDocumentParts(options.document, targetPartIds)

  if (parts.length === getParameterTargetPartIds(parameter).length) {
    return undefined
  }

  return replaceParameter(options.document, parameter.id, (candidate) => ({
    ...candidate,
    keyforms: candidate.keyforms.map((keyform) => synchronizeKeyformParts(keyform, parts)),
    targetPartIds: parts.map((part) => part.id),
  }))
}

export const disconnectParameterParts = (options: UpdateParameterTargetsOptions) => {
  const parameter = getDocumentParameters(options.document).find(
    (candidate) => candidate.id === options.parameterId,
  )

  if (parameter === undefined) {
    return undefined
  }

  const parts = getDocumentParts(
    options.document,
    difference(getParameterTargetPartIds(parameter), options.partIds),
  )

  if (parts.length === getParameterTargetPartIds(parameter).length) {
    return undefined
  }

  const targetPartIds = new Set(parts.map((part) => part.id))
  return replaceParameter(options.document, parameter.id, (candidate) => ({
    ...candidate,
    keyforms: candidate.keyforms.map((keyform) => ({
      ...keyform,
      parts: keyform.parts.filter((part) => targetPartIds.has(part.partId)),
    })),
    targetPartIds: parts.map((part) => part.id),
  }))
}

export const setParameterKeyformVertex = (options: SetParameterKeyformVertexOptions) => {
  const parameter = getDocumentParameters(options.document).find(
    (candidate) => candidate.id === options.parameterId,
  )
  const keyform = parameter?.keyforms.find((candidate) => candidate.value === options.value)
  const part = options.document.parts.find((candidate) => candidate.id === options.partId)

  if (parameter === undefined || keyform === undefined || part === undefined) {
    return undefined
  }

  if (!getParameterTargetPartIds(parameter).includes(part.id)) {
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

  return replaceParameter(options.document, parameter.id, (candidate) => ({
    ...candidate,
    keyforms: candidate.keyforms.map((candidateKeyform) =>
      candidateKeyform.value === keyform.value
        ? {
            ...candidateKeyform,
            parts: replacePartKeyform(candidateKeyform.parts, {partId: part.id, vertices}),
          }
        : candidateKeyform,
    ),
  }))
}

export interface CreateParameterPreviewOptions {
  readonly document: PuppetDocument
  readonly parameter?: PuppetParameter
  readonly value: number
}

export const createParameterPreview = (options: CreateParameterPreviewOptions): PuppetDocument => ({
  ...options.document,
  motions: [],
  parts: options.document.parts.map((part) => ({
    ...part,
    mesh: {
      ...part.mesh,
      vertices: sampleParameterVertices({
        parameter: options.parameter,
        partId: part.id,
        restVertices: part.mesh.vertices,
        value: options.value,
      }),
    },
  })),
})
