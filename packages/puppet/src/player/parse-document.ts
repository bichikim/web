import {
  PUPPET_DOCUMENT_FORMAT,
  PUPPET_DOCUMENT_VERSION,
  type PuppetDocument,
  type PuppetKeyframe,
  type PuppetMesh,
  type PuppetMotion,
  type PuppetPart,
  type PuppetTexture,
  type PuppetTrack,
  type PuppetTrackAxis,
  type PuppetViewport,
} from './document'
import {normalizeMesh} from '../mesh/normalize'
import {validateMesh} from '../mesh/validate'

export type ParseDocumentErrorCode = 'invalid-document' | 'invalid-json'

export interface ParseDocumentError {
  readonly code: ParseDocumentErrorCode
}

export interface ParseDocumentSuccess {
  readonly document: PuppetDocument
  readonly ok: true
}

export interface ParseDocumentFailure {
  readonly error: ParseDocumentError
  readonly ok: false
}

export type ParseDocumentResult = ParseDocumentFailure | ParseDocumentSuccess

const COORDINATES_PER_VERTEX = 2
const INDICES_PER_TRIANGLE = 3
const MINIMUM_VERTEX_COUNT = 3

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value)

const isFiniteNumberArray = (value: unknown): value is ReadonlyArray<number> =>
  Array.isArray(value) && value.every(isFiniteNumber)

const isBoundaryLoops = (value: unknown): value is ReadonlyArray<ReadonlyArray<number>> =>
  Array.isArray(value) && value.every(isFiniteNumberArray)

const isViewport = (value: unknown): value is PuppetViewport =>
  isRecord(value) &&
  isFiniteNumber(value.width) &&
  value.width > 0 &&
  isFiniteNumber(value.height) &&
  value.height > 0

const isTexture = (value: unknown): value is PuppetTexture =>
  isRecord(value) &&
  typeof value.src === 'string' &&
  value.src.length > 0 &&
  isFiniteNumber(value.width) &&
  value.width > 0 &&
  isFiniteNumber(value.height) &&
  value.height > 0

const isMesh = (value: unknown): value is PuppetMesh => {
  if (
    !isRecord(value) ||
    !isFiniteNumberArray(value.vertices) ||
    !isFiniteNumberArray(value.uvs) ||
    !isFiniteNumberArray(value.indices) ||
    (value.boundaryLoops !== undefined && !isBoundaryLoops(value.boundaryLoops))
  ) {
    return false
  }

  const vertexCount = value.vertices.length / COORDINATES_PER_VERTEX
  const hasValidCoordinates =
    Number.isInteger(vertexCount) &&
    vertexCount >= MINIMUM_VERTEX_COUNT &&
    value.uvs.length === value.vertices.length
  const hasValidTriangles =
    value.indices.length > 0 &&
    value.indices.length % INDICES_PER_TRIANGLE === 0 &&
    value.indices.every((index) => Number.isInteger(index) && index >= 0 && index < vertexCount)
  const mesh: PuppetMesh = {
    ...(value.boundaryLoops === undefined ? {} : {boundaryLoops: value.boundaryLoops}),
    indices: value.indices,
    uvs: value.uvs,
    vertices: value.vertices,
  }

  return hasValidCoordinates && hasValidTriangles && validateMesh(mesh).valid
}

const isPart = (value: unknown): value is PuppetPart =>
  isRecord(value) &&
  typeof value.id === 'string' &&
  value.id.length > 0 &&
  isTexture(value.texture) &&
  isMesh(value.mesh)

const isTrackAxis = (value: unknown): value is PuppetTrackAxis => value === 'x' || value === 'y'

const isKeyframe = (value: unknown): value is PuppetKeyframe =>
  isRecord(value) && isFiniteNumber(value.time) && value.time >= 0 && isFiniteNumber(value.value)

const hasOrderedKeyframes = (keyframes: ReadonlyArray<PuppetKeyframe>, duration: number) =>
  keyframes.every((keyframe, index) => {
    const previousKeyframe = keyframes[index - 1]
    const followsPrevious = previousKeyframe === undefined || keyframe.time >= previousKeyframe.time

    return followsPrevious && keyframe.time <= duration
  })

const isTrack = (value: unknown, duration: number): value is PuppetTrack =>
  isRecord(value) &&
  typeof value.partId === 'string' &&
  value.partId.length > 0 &&
  isFiniteNumber(value.vertexIndex) &&
  Number.isInteger(value.vertexIndex) &&
  value.vertexIndex >= 0 &&
  isTrackAxis(value.axis) &&
  Array.isArray(value.keyframes) &&
  value.keyframes.length > 0 &&
  value.keyframes.every(isKeyframe) &&
  hasOrderedKeyframes(value.keyframes, duration)

const isMotion = (value: unknown): value is PuppetMotion => {
  if (
    !isRecord(value) ||
    typeof value.id !== 'string' ||
    value.id.length === 0 ||
    !isFiniteNumber(value.duration) ||
    value.duration <= 0 ||
    !Array.isArray(value.tracks)
  ) {
    return false
  }

  const {duration} = value

  return value.tracks.every((track) => isTrack(track, duration))
}

const hasUniqueIds = (values: ReadonlyArray<{readonly id: string}>) =>
  new Set(values.map((value) => value.id)).size === values.length

const hasValidTrackTargets = (
  parts: ReadonlyArray<PuppetPart>,
  motions: ReadonlyArray<PuppetMotion>,
) => {
  const partById = new Map(parts.map((part) => [part.id, part]))

  return motions.every((motion) =>
    motion.tracks.every((track) => {
      const part = partById.get(track.partId)
      const vertexCount =
        part === undefined ? 0 : part.mesh.vertices.length / COORDINATES_PER_VERTEX

      return part !== undefined && track.vertexIndex < vertexCount
    }),
  )
}

const isDocument = (value: unknown): value is PuppetDocument => {
  if (
    !isRecord(value) ||
    value.format !== PUPPET_DOCUMENT_FORMAT ||
    value.version !== PUPPET_DOCUMENT_VERSION ||
    !isViewport(value.viewport) ||
    !Array.isArray(value.parts) ||
    !value.parts.every(isPart) ||
    !Array.isArray(value.motions) ||
    !value.motions.every(isMotion)
  ) {
    return false
  }

  return (
    hasUniqueIds(value.parts) &&
    hasUniqueIds(value.motions) &&
    hasValidTrackTargets(value.parts, value.motions)
  )
}

export const parseDocument = (source: string): ParseDocumentResult => {
  let value: unknown

  try {
    value = JSON.parse(source)
  } catch {
    return {error: {code: 'invalid-json'}, ok: false}
  }

  if (!isDocument(value)) {
    return {error: {code: 'invalid-document'}, ok: false}
  }

  return {
    document: {
      ...value,
      parts: value.parts.map((part) => ({...part, mesh: normalizeMesh(part.mesh)})),
    },
    ok: true,
  }
}
