import {
  PUPPET_DOCUMENT_FORMAT,
  PUPPET_DOCUMENT_VERSION,
  PUPPET_EASINGS,
  type PuppetDocument,
  type PuppetEasing,
  type PuppetKeyframe,
  type PuppetMesh,
  type PuppetMotion,
  type PuppetParameter,
  type PuppetParameterBinding,
  type PuppetParameterKeyform,
  type PuppetParameterPartKeyform,
  type PuppetPart,
  type PuppetScene,
  type PuppetTexture,
  type PuppetTrack,
  type PuppetTrackAxis,
  type PuppetViewport,
} from './document'
import {normalizeMesh} from '../mesh/normalize'
import {validateMesh} from '../mesh/validate'
import {markPreparedPuppetDocument, type PreparedPuppetDocument} from './internal/prepared-document'

export type ParseDocumentErrorCode = 'invalid-document' | 'invalid-json'

export interface ParseDocumentError {
  readonly code: ParseDocumentErrorCode
}

export interface ParseDocumentSuccess {
  readonly document: PreparedPuppetDocument
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
  Number.isInteger(value.width) &&
  value.width > 0 &&
  isFiniteNumber(value.height) &&
  Number.isInteger(value.height) &&
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

const isScene = (value: unknown, parts: ReadonlyArray<PuppetPart>): value is PuppetScene => {
  if (!isRecord(value) || !Array.isArray(value.roots)) {
    return false
  }

  const partIds = new Set(parts.map((part) => part.id))
  const scenePartIds = new Set<string>()
  const nodeIds = new Set<string>()
  const visitedNodes = new Set<object>()
  const pendingNodes: Array<unknown> = [...value.roots]

  while (pendingNodes.length > 0) {
    const node = pendingNodes.pop()

    if (
      !isRecord(node) ||
      visitedNodes.has(node) ||
      typeof node.id !== 'string' ||
      node.id.length === 0 ||
      nodeIds.has(node.id) ||
      typeof node.name !== 'string' ||
      node.name.length === 0 ||
      typeof node.visible !== 'boolean' ||
      typeof node.locked !== 'boolean'
    ) {
      return false
    }

    visitedNodes.add(node)
    nodeIds.add(node.id)

    switch (node.kind) {
      case 'group':
        if (!Array.isArray(node.children)) {
          return false
        }

        pendingNodes.push(...node.children)
        break
      case 'part':
        if (!partIds.has(node.id)) {
          return false
        }

        scenePartIds.add(node.id)
        break
      default:
        return false
    }
  }

  return scenePartIds.size === parts.length
}

const isParameterPartKeyform = (value: unknown): value is PuppetParameterPartKeyform =>
  isRecord(value) &&
  typeof value.partId === 'string' &&
  value.partId.length > 0 &&
  isFiniteNumberArray(value.vertices)

interface LegacyParameterKeyform {
  readonly parts: ReadonlyArray<PuppetParameterPartKeyform>
  readonly value: number
}

interface LegacyParameter extends PuppetParameter {
  readonly keyforms: ReadonlyArray<LegacyParameterKeyform>
  readonly targetPartIds?: ReadonlyArray<string>
}

const hasValidTargetPartIds = (value: unknown) =>
  value === undefined ||
  (Array.isArray(value) &&
    value.every((partId) => typeof partId === 'string' && partId.length > 0) &&
    new Set(value).size === value.length)

const isLegacyParameterKeyform = (value: unknown): value is LegacyParameterKeyform =>
  isRecord(value) &&
  isFiniteNumber(value.value) &&
  Array.isArray(value.parts) &&
  value.parts.every(isParameterPartKeyform) &&
  new Set(value.parts.map((part) => part.partId)).size === value.parts.length

const isParameterDefinition = (value: unknown): value is PuppetParameter =>
  isRecord(value) &&
  typeof value.id === 'string' &&
  value.id.length > 0 &&
  typeof value.name === 'string' &&
  value.name.length > 0 &&
  isFiniteNumber(value.minimum) &&
  isFiniteNumber(value.maximum) &&
  value.minimum < value.maximum &&
  isFiniteNumber(value.defaultValue) &&
  value.defaultValue >= value.minimum &&
  value.defaultValue <= value.maximum

const isLegacyParameter = (value: unknown): value is LegacyParameter => {
  if (!isRecord(value)) {
    return false
  }

  const {keyforms, targetPartIds} = value
  if (
    !isParameterDefinition(value) ||
    !hasValidTargetPartIds(targetPartIds) ||
    !Array.isArray(keyforms) ||
    !keyforms.every(isLegacyParameterKeyform)
  ) {
    return false
  }

  const {maximum, minimum} = value
  return keyforms.every(
    (keyform, index) =>
      keyform.value >= minimum &&
      keyform.value <= maximum &&
      (index === 0 || keyform.value > keyforms[index - 1]!.value),
  )
}

const isParameterKeyform = (value: unknown): value is PuppetParameterKeyform =>
  isRecord(value) &&
  Array.isArray(value.values) &&
  (value.values.length === 1 || value.values.length === 2) &&
  value.values.every(isFiniteNumber) &&
  Array.isArray(value.parts) &&
  value.parts.every(isParameterPartKeyform) &&
  new Set(value.parts.map((part) => part.partId)).size === value.parts.length

const isParameterBinding = (value: unknown): value is PuppetParameterBinding => {
  if (!isRecord(value)) {
    return false
  }

  const {keyforms, parameterIds, targetPartIds} = value
  if (
    typeof value.id !== 'string' ||
    value.id.length === 0 ||
    !Array.isArray(parameterIds) ||
    (parameterIds.length !== 1 && parameterIds.length !== 2) ||
    !parameterIds.every(
      (parameterId) => typeof parameterId === 'string' && parameterId.length > 0,
    ) ||
    new Set(parameterIds).size !== parameterIds.length ||
    !hasValidTargetPartIds(targetPartIds) ||
    !Array.isArray(keyforms) ||
    !keyforms.every(isParameterKeyform) ||
    !keyforms.every((keyform) => keyform.values.length === parameterIds.length)
  ) {
    return false
  }

  const coordinates = keyforms.map((keyform) => keyform.values.join(':'))
  if (new Set(coordinates).size !== coordinates.length) {
    return false
  }

  if (parameterIds.length === 1) {
    return keyforms.every(
      (keyform, index) => index === 0 || keyform.values[0]! > keyforms[index - 1]!.values[0]!,
    )
  }

  return true
}

const isTrackAxis = (value: unknown): value is PuppetTrackAxis => value === 'x' || value === 'y'

const isEasing = (value: unknown): value is PuppetEasing =>
  typeof value === 'string' && PUPPET_EASINGS.some((easing) => easing === value)

const isKeyframe = (value: unknown): value is PuppetKeyframe =>
  isRecord(value) &&
  isFiniteNumber(value.time) &&
  value.time >= 0 &&
  isFiniteNumber(value.value) &&
  (value.easing === undefined || isEasing(value.easing))

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

const hasValidParameterBindings = (
  parts: ReadonlyArray<PuppetPart>,
  parameters: ReadonlyArray<PuppetParameter>,
  bindings: ReadonlyArray<PuppetParameterBinding>,
) => {
  const partById = new Map(parts.map((part) => [part.id, part]))
  const parameterById = new Map(parameters.map((parameter) => [parameter.id, parameter]))

  return bindings.every((binding) => {
    const {keyforms, targetPartIds} = binding
    const targetPartIdSet = targetPartIds === undefined ? undefined : new Set(targetPartIds)

    if (
      binding.parameterIds.some((parameterId) => !parameterById.has(parameterId)) ||
      targetPartIds?.some((partId) => !partById.has(partId)) === true ||
      keyforms.some((keyform) =>
        keyform.values.some((value, index) => {
          const parameter = parameterById.get(binding.parameterIds[index]!)
          return parameter === undefined || value < parameter.minimum || value > parameter.maximum
        }),
      )
    ) {
      return false
    }

    return keyforms.every((keyform) => {
      if (
        targetPartIdSet !== undefined &&
        (keyform.parts.length !== targetPartIdSet.size ||
          keyform.parts.some((part) => !targetPartIdSet.has(part.partId)))
      ) {
        return false
      }

      return keyform.parts.every((partKeyform) => {
        const part = partById.get(partKeyform.partId)
        return part !== undefined && partKeyform.vertices.length === part.mesh.vertices.length
      })
    })
  })
}

interface CurrentDocumentValue {
  readonly format: typeof PUPPET_DOCUMENT_FORMAT
  readonly motions: ReadonlyArray<PuppetMotion>
  readonly parameterBindings?: ReadonlyArray<PuppetParameterBinding>
  readonly parameters?: ReadonlyArray<PuppetParameter>
  readonly parts: ReadonlyArray<PuppetPart>
  readonly scene?: PuppetScene
  readonly version: typeof PUPPET_DOCUMENT_VERSION
  readonly viewport: PuppetViewport
}

const hasValidDocumentCollections = (
  value: Record<string, unknown>,
): value is Record<string, unknown> & CurrentDocumentValue =>
  isViewport(value.viewport) &&
  Array.isArray(value.parts) &&
  value.parts.every(isPart) &&
  (value.scene === undefined || isScene(value.scene, value.parts)) &&
  Array.isArray(value.motions) &&
  value.motions.every(isMotion) &&
  (value.parameters === undefined ||
    (Array.isArray(value.parameters) && value.parameters.every(isParameterDefinition))) &&
  (value.parameterBindings === undefined ||
    (Array.isArray(value.parameterBindings) && value.parameterBindings.every(isParameterBinding)))

const isDocument = (value: unknown): value is PuppetDocument => {
  if (
    !isRecord(value) ||
    value.format !== PUPPET_DOCUMENT_FORMAT ||
    value.version !== PUPPET_DOCUMENT_VERSION ||
    !hasValidDocumentCollections(value)
  ) {
    return false
  }

  const parameters = value.parameters ?? []
  const parameterBindings = value.parameterBindings ?? []

  return (
    hasUniqueIds(value.parts) &&
    hasUniqueIds(value.motions) &&
    hasUniqueIds(parameters) &&
    hasUniqueIds(parameterBindings) &&
    hasValidTrackTargets(value.parts, value.motions) &&
    hasValidParameterBindings(value.parts, parameters, parameterBindings)
  )
}

const migrateLegacyDocument = (value: unknown): PuppetDocument | undefined => {
  if (
    !isRecord(value) ||
    value.format !== PUPPET_DOCUMENT_FORMAT ||
    value.version !== 1 ||
    !isViewport(value.viewport) ||
    !Array.isArray(value.parts) ||
    !value.parts.every(isPart) ||
    (value.scene !== undefined && !isScene(value.scene, value.parts)) ||
    !Array.isArray(value.motions) ||
    !value.motions.every(isMotion) ||
    (value.parameters !== undefined &&
      (!Array.isArray(value.parameters) || !value.parameters.every(isLegacyParameter)))
  ) {
    return undefined
  }

  const legacyParameters = value.parameters ?? []
  const document: PuppetDocument = {
    format: PUPPET_DOCUMENT_FORMAT,
    motions: value.motions,
    parameterBindings: legacyParameters.map((parameter) => ({
      id: parameter.id,
      keyforms: parameter.keyforms.map((keyform) => ({
        parts: keyform.parts,
        values: [keyform.value],
      })),
      parameterIds: [parameter.id],
      ...(parameter.targetPartIds === undefined ? {} : {targetPartIds: parameter.targetPartIds}),
    })),
    parameters: legacyParameters.map((parameter) => ({
      defaultValue: parameter.defaultValue,
      id: parameter.id,
      maximum: parameter.maximum,
      minimum: parameter.minimum,
      name: parameter.name,
    })),
    parts: value.parts,
    ...(value.scene === undefined ? {} : {scene: value.scene}),
    version: PUPPET_DOCUMENT_VERSION,
    viewport: value.viewport,
  }

  return isDocument(document) ? document : undefined
}

export const parseDocumentValue = (value: unknown): ParseDocumentResult => {
  const document = isDocument(value) ? value : migrateLegacyDocument(value)

  if (document === undefined) {
    return {error: {code: 'invalid-document'}, ok: false}
  }

  return {
    document: markPreparedPuppetDocument({
      ...document,
      parts: document.parts.map((part) => ({...part, mesh: normalizeMesh(part.mesh)})),
    }),
    ok: true,
  }
}

export const parseDocument = (source: string): ParseDocumentResult => {
  let value: unknown

  try {
    value = JSON.parse(source)
  } catch {
    return {error: {code: 'invalid-json'}, ok: false}
  }

  return parseDocumentValue(value)
}
