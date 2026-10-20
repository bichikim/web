import {getMotionTimelineRows} from './motion-timeline-rows'
import {isPsdSource} from './internal/parse-psd-source'
import {hasValidSkinning} from './internal/parse-skinning'
import {hasValidGlueKeyforms, isGlueKeyforms} from './internal/parse-glue'
import {hasValidInfluences, isParameterInfluences} from './internal/parse-influence'
import {
  MAX_PARAMETER_DIMENSIONS,
  PUPPET_DOCUMENT_FORMAT,
  PUPPET_DOCUMENT_VERSION,
  type PuppetDocument,
  type PuppetMesh,
  type PuppetMotion,
  type PuppetParameter,
  type PuppetParameterBinding,
  type PuppetParameterKeyform,
  type PuppetParameterPartKeyform,
  type PuppetPart,
  type PuppetPhysics,
  type PuppetScene,
  type PuppetSceneNode,
  type PuppetTexture,
  type PuppetViewport,
} from './document'
import {normalizeMesh} from '../mesh/normalize'
import {validateMesh} from '../mesh/validate'
import {markPreparedPuppetDocument, type PreparedPuppetDocument} from './internal/prepared-document'
import {canUsePartAsMask} from './part-mask'
import {
  hasValidDeformerKeyform,
  isDeformer,
  isParameterDeformerKeyform,
} from './internal/parse-deformer'
import {hasValidTrackTargets, isMotion, normalizeLegacyTrackKinds} from './internal/parse-motion'
import {
  hasValidBreath,
  hasValidLook,
  hasValidMouthShapes,
  hasValidParameterGroups,
  hasValidParameterRoles,
  isOptionalFramesPerSecond,
  isOptionalLayout,
} from './internal/parse-model-metadata'
import {hasValidParameterOptions} from './internal/parse-parameter'
import {hasValidPhysics} from './internal/parse-physics'
import {hasValidLayerOrderRules} from './internal/parse-layer-order'
import {hasValidGroupKeyforms} from './internal/parse-group-keyforms'
import {getSceneGroupIds} from './internal/scene-groups'
import {
  hasValidTargetIds,
  isGroupRenderProperties,
  isPartRenderProperties,
} from './internal/parse-part-properties'
import {hasValidExpressions} from './internal/parse-expression'
import {hasValidHitAreas} from './internal/parse-hit-area'
import {hasValidPoseGroups} from './internal/parse-pose'
import {hasValidSpatialAttachments, isSpatialSurface} from './internal/parse-spatial'
import {expandDocumentTextureAssets} from './texture-assets'
import {isFiniteNumber, isFiniteNumberArray, isRecord} from './internal/parse-primitives'

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

const isViewport = (value: unknown): value is PuppetViewport =>
  isRecord(value) &&
  isFiniteNumber(value.width) &&
  value.width > 0 &&
  isFiniteNumber(value.height) &&
  value.height > 0

const isPositiveInteger = (value: unknown): value is number =>
  Number.isInteger(value) && (value as number) > 0

const isNonNegativeInteger = (value: unknown): value is number =>
  Number.isInteger(value) && (value as number) >= 0

/** Whole, non-empty pixels within the texture. */
const isTextureRegion = (value: unknown, width: number, height: number) =>
  isRecord(value) &&
  isNonNegativeInteger(value.x) &&
  isNonNegativeInteger(value.y) &&
  isPositiveInteger(value.width) &&
  isPositiveInteger(value.height) &&
  value.x + value.width <= width &&
  value.y + value.height <= height

const isTexture = (value: unknown): value is PuppetTexture =>
  isRecord(value) &&
  typeof value.src === 'string' &&
  value.src.length > 0 &&
  isPositiveInteger(value.width) &&
  isPositiveInteger(value.height) &&
  (value.region === undefined || isTextureRegion(value.region, value.width, value.height))

const isMesh = (value: unknown): value is PuppetMesh => {
  if (
    !isRecord(value) ||
    !isFiniteNumberArray(value.vertices) ||
    !isFiniteNumberArray(value.uvs) ||
    !isFiniteNumberArray(value.indices) ||
    (value.boundaryLoops !== undefined &&
      (!Array.isArray(value.boundaryLoops) || !value.boundaryLoops.every(isFiniteNumberArray)))
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
  isPsdSource(value.psdSource) &&
  typeof value.id === 'string' &&
  value.id.length > 0 &&
  (value.properties === undefined || isPartRenderProperties(value.properties)) &&
  isTexture(value.texture) &&
  isMesh(value.mesh) &&
  (value.spatial === undefined || isSpatialSurface(value.spatial, value.mesh)) &&
  (value.userData === undefined || typeof value.userData === 'string')

const inspectSceneNode = (
  node: Record<string, unknown>,
  partIds: ReadonlySet<string>,
): {readonly children: ReadonlyArray<unknown>; readonly partId?: string} | undefined => {
  switch (node.kind) {
    case 'deformer':
      return Array.isArray(node.children) && isDeformer(node)
        ? {children: node.children}
        : undefined
    case 'group':
      return Array.isArray(node.children) &&
        (node.properties === undefined || isGroupRenderProperties(node.properties, partIds))
        ? {children: node.children}
        : undefined
    case 'part':
      return typeof node.id === 'string' && partIds.has(node.id)
        ? {children: [], partId: node.id}
        : undefined
    default:
      return undefined
  }
}

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

    const inspection = inspectSceneNode(node, partIds)
    if (inspection === undefined) {
      return false
    }
    pendingNodes.push(...inspection.children)
    if (inspection.partId !== undefined) {
      scenePartIds.add(inspection.partId)
    }
  }

  return (
    scenePartIds.size === parts.length &&
    hasValidSkinning(value.roots as ReadonlyArray<PuppetSceneNode>, parts)
  )
}

const isParameterPartKeyform = (value: unknown): value is PuppetParameterPartKeyform =>
  isRecord(value) &&
  isGlueKeyforms(value.glue) &&
  typeof value.partId === 'string' &&
  value.partId.length > 0 &&
  (value.properties === undefined ||
    (isPartRenderProperties(value.properties) &&
      value.properties.alphaBlendMode === undefined &&
      value.properties.blendMode === undefined &&
      value.properties.clippingMaskIds === undefined &&
      value.properties.culling === undefined &&
      value.properties.invertedMask === undefined &&
      value.properties.renderWhenUsedAsMask === undefined)) &&
  isFiniteNumberArray(value.vertices)

const isParameterDefinition = (value: unknown): value is PuppetParameter =>
  isRecord(value) &&
  value.keyforms === undefined &&
  value.targetPartIds === undefined &&
  typeof value.id === 'string' &&
  value.id.length > 0 &&
  typeof value.name === 'string' &&
  value.name.length > 0 &&
  isFiniteNumber(value.minimum) &&
  isFiniteNumber(value.maximum) &&
  value.minimum < value.maximum &&
  isFiniteNumber(value.defaultValue) &&
  value.defaultValue >= value.minimum &&
  value.defaultValue <= value.maximum &&
  (value.repeat === undefined ||
    (typeof value.repeat === 'boolean' &&
      (value.repeat === false || value.options === undefined))) &&
  (value.groupId === undefined || typeof value.groupId === 'string') &&
  hasValidParameterOptions(value)

const isParameterKeyform = (value: unknown): value is PuppetParameterKeyform =>
  isRecord(value) &&
  Array.isArray(value.values) &&
  value.values.length >= 1 &&
  value.values.length <= MAX_PARAMETER_DIMENSIONS &&
  value.values.every(isFiniteNumber) &&
  (value.deformers === undefined ||
    (Array.isArray(value.deformers) &&
      value.deformers.every(isParameterDeformerKeyform) &&
      new Set(value.deformers.map((deformer) => deformer.nodeId)).size ===
        value.deformers.length)) &&
  Array.isArray(value.parts) &&
  value.parts.every(isParameterPartKeyform) &&
  new Set(value.parts.map((part) => part.partId)).size === value.parts.length

const isParameterBinding = (value: unknown): value is PuppetParameterBinding => {
  if (!isRecord(value)) {
    return false
  }

  const {keyforms, parameterIds, targetDeformerIds, targetPartIds} = value
  if (
    (value.influences !== undefined && !isParameterInfluences(value.influences)) ||
    typeof value.id !== 'string' ||
    value.id.length === 0 ||
    !Array.isArray(parameterIds) ||
    parameterIds.length < 1 ||
    parameterIds.length > MAX_PARAMETER_DIMENSIONS ||
    !parameterIds.every(
      (parameterId) => typeof parameterId === 'string' && parameterId.length > 0,
    ) ||
    new Set(parameterIds).size !== parameterIds.length ||
    !hasValidTargetIds(targetDeformerIds) ||
    !hasValidTargetIds(targetPartIds) ||
    !hasValidTargetIds(value.targetGroupIds) ||
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

const hasUniqueIds = (values: ReadonlyArray<{readonly id: string}>) =>
  new Set(values.map((value) => value.id)).size === values.length

const hasValidPartMasks = (parts: ReadonlyArray<PuppetPart>) => {
  const partIds = new Set(parts.map((part) => part.id))
  return parts.every((part) => {
    const maskIds = part.properties?.clippingMaskIds ?? []
    return maskIds.every(
      (maskPartId) =>
        partIds.has(maskPartId) && canUsePartAsMask({maskPartId, partId: part.id, parts}),
    )
  })
}

const hasValidParameterBindings = (
  parts: ReadonlyArray<PuppetPart>,
  parameters: ReadonlyArray<PuppetParameter>,
  bindings: ReadonlyArray<PuppetParameterBinding>,
  scene: PuppetScene | undefined,
) => {
  const partById = new Map(parts.map((part) => [part.id, part]))
  const parameterById = new Map(parameters.map((parameter) => [parameter.id, parameter]))
  const deformerById = new Map<string, PuppetSceneNode>()
  const pendingNodes = [...(scene?.roots ?? [])]
  while (pendingNodes.length > 0) {
    const node = pendingNodes.pop()!
    if (node.kind !== 'part') {
      pendingNodes.push(...node.children)
      if (node.kind !== 'group') {
        deformerById.set(node.id, node)
      }
    }
  }

  return (
    hasValidGroupKeyforms(bindings, scene) &&
    bindings.every((binding) => {
      const {keyforms, targetDeformerIds, targetPartIds} = binding
      const targetPartIdSet = targetPartIds === undefined ? undefined : new Set(targetPartIds)
      const targetDeformerIdSet =
        targetDeformerIds === undefined ? undefined : new Set(targetDeformerIds)

      if (
        !hasValidInfluences(binding.influences ?? [], parameters) ||
        binding.parameterIds.some((parameterId) => !parameterById.has(parameterId)) ||
        targetPartIds?.some((partId) => !partById.has(partId)) === true ||
        targetDeformerIds?.some((nodeId) => !deformerById.has(nodeId)) === true ||
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

        const deformers = keyform.deformers ?? []
        if (
          targetDeformerIdSet !== undefined &&
          (deformers.length !== targetDeformerIdSet.size ||
            deformers.some((deformer) => !targetDeformerIdSet.has(deformer.nodeId)))
        ) {
          return false
        }

        if (
          deformers.some(
            (deformer) => !hasValidDeformerKeyform(deformer, deformerById.get(deformer.nodeId)),
          )
        ) {
          return false
        }

        return keyform.parts.every((partKeyform) => {
          const part = partById.get(partKeyform.partId)
          return (
            part !== undefined &&
            (partKeyform.vertices.length === 0 ||
              partKeyform.vertices.length === part.mesh.vertices.length)
          )
        })
      })
    })
  )
}

interface CurrentDocumentValue {
  readonly framesPerSecond?: number
  readonly format: typeof PUPPET_DOCUMENT_FORMAT
  readonly motions: ReadonlyArray<PuppetMotion>
  readonly parameterBindings?: ReadonlyArray<PuppetParameterBinding>
  readonly parameters?: ReadonlyArray<PuppetParameter>
  readonly parts: ReadonlyArray<PuppetPart>
  readonly physics?: PuppetPhysics
  readonly scene?: PuppetScene
  readonly version: typeof PUPPET_DOCUMENT_VERSION
  readonly viewport: PuppetViewport
}

const hasValidDocumentCollections = (
  value: Record<string, unknown>,
): value is Record<string, unknown> & CurrentDocumentValue =>
  isOptionalFramesPerSecond(value.framesPerSecond) &&
  isViewport(value.viewport) &&
  isOptionalLayout(value.layout) &&
  Array.isArray(value.parts) &&
  value.parts.every(isPart) &&
  (value.scene === undefined || isScene(value.scene, value.parts)) &&
  Array.isArray(value.motions) &&
  value.motions.every(isMotion) &&
  (value.parameters === undefined ||
    (Array.isArray(value.parameters) && value.parameters.every(isParameterDefinition))) &&
  (value.parameterBindings === undefined ||
    (Array.isArray(value.parameterBindings) && value.parameterBindings.every(isParameterBinding)))

/** Motion track targets, parameter roles and display groups. */
const hasValidModelMetadata = (
  value: Pick<PuppetDocument, 'motions' | 'parts' | 'scene'> & Record<string, unknown>,
  parameters: ReadonlyArray<PuppetParameter>,
) =>
  hasValidTrackTargets(value.parts, parameters, value.motions, getSceneGroupIds(value.scene)) &&
  hasValidParameterRoles(value.parameterRoles, parameters) &&
  hasValidParameterGroups(value.parameterGroups, parameters) &&
  hasValidMouthShapes(value.mouthShapes, parameters) &&
  hasValidBreath(value.breath, parameters) &&
  hasValidLook(value.look, parameters)

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
    hasValidLayerOrderRules(value.layerOrderRules, value.parts, parameters) &&
    hasValidGlueKeyforms(value.glue, parameterBindings, value.parts) &&
    hasValidPhysics(value.physics, parameters) &&
    hasValidExpressions(value.expressions, parameters) &&
    hasValidPoseGroups(value.poseGroups, value.parts, parameters) &&
    hasValidHitAreas(value.hitAreas, value.parts) &&
    hasUniqueIds(value.parts) &&
    hasValidPartMasks(value.parts) &&
    hasValidSpatialAttachments(value.parts, value.scene) &&
    hasUniqueIds(value.motions) &&
    hasUniqueIds(parameters) &&
    hasUniqueIds(parameterBindings) &&
    hasValidModelMetadata(value, parameters) &&
    hasValidParameterBindings(value.parts, parameters, parameterBindings, value.scene)
  )
}

export const parseDocumentValue = (value: unknown): ParseDocumentResult => {
  const normalizedValue = normalizeLegacyTrackKinds(expandDocumentTextureAssets(value))
  if (!isDocument(normalizedValue)) {
    return {error: {code: 'invalid-document'}, ok: false}
  }

  return {
    document: markPreparedPuppetDocument({
      ...normalizedValue,
      motions: normalizedValue.motions.map((motion) => {
        const rows = getMotionTimelineRows(normalizedValue, motion)
        return rows.parameterIds.length === (motion.timelineParameterIds?.length ?? 0)
          ? motion
          : {
              ...motion,
              timelineEffectRows: rows.effectRows,
              timelineParameterIds: rows.parameterIds,
            }
      }),
      parts: normalizedValue.parts.map((part) => ({...part, mesh: normalizeMesh(part.mesh)})),
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
