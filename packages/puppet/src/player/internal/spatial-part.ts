import {
  projectSpatialSurface,
  type SpatialProjection,
} from '../../deformation/project-spatial-surface'
import {composeParameterDeformer} from '../../deformation/scene'
import {
  getSpatialMeshAttachmentSampler,
  resolveSpatialMeshAttachment,
} from '../../deformation/bind-spatial-mesh'
import type {PuppetParameterValueMap} from '../../deformation/composition'
import type {
  PuppetDocument,
  PuppetPart,
  PuppetScene,
  PuppetSceneDeformerNode,
  PuppetSpatialAttachment,
  PuppetSpatialMesh,
  PuppetSpatialSurface,
} from '../document'
import {getDocumentScene} from '../scene'
import {resolveParameterValue} from '../parameter-value'

const FACING_AREA_RATIO = 0.000_001
const SPATIAL_COORDINATES = 3
const legacyAttachments = new WeakMap<
  PuppetSpatialSurface,
  {
    readonly position: readonly [number, number, number]
    readonly attachments: ReadonlyArray<PuppetSpatialAttachment>
  }
>()
const getLegacyAttachments = (
  surface: PuppetSpatialSurface,
  mesh: PuppetSpatialMesh,
  position: readonly [number, number, number],
): ReadonlyArray<PuppetSpatialAttachment> | undefined => {
  const cached = legacyAttachments.get(surface)
  if (cached?.position.every((coordinate, index) => coordinate === position[index])) {
    return cached.attachments
  }
  const sample = getSpatialMeshAttachmentSampler(mesh)
  const attachments = Array.from(
    {length: surface.controlPoints.length / SPATIAL_COORDINATES},
    (_, index) => {
      const offset = index * SPATIAL_COORDINATES
      const x = surface.controlPoints[offset]!
      const y = surface.controlPoints[offset + 1]!
      const z = surface.controlPoints[offset + 2]!
      const result = sample(x - position[0], y - position[1])
      return result === undefined
        ? undefined
        : {
            ...result.attachment,
            offset: [
              result.attachment.offset[0],
              result.attachment.offset[1],
              z - result.point[2] - position[2],
            ] as const,
          }
    },
  )
  if (attachments.some((attachment) => attachment === undefined)) {
    return undefined
  }
  const valid = attachments.filter(
    (attachment): attachment is PuppetSpatialAttachment => attachment !== undefined,
  )
  legacyAttachments.set(surface, {attachments: valid, position: [...position]})
  return valid
}

export interface SpatialPartPose extends SpatialProjection {
  readonly depth: number
  readonly facing: boolean
}

export interface GetSpatialPartPoseOptions {
  readonly document: PuppetDocument
  readonly parameterValues?: PuppetParameterValueMap
  readonly part: PuppetPart
  readonly posedScene?: PuppetScene
}

export interface ResolveSpatialRotationOptions {
  readonly document: PuppetDocument
  readonly parameterIds?: readonly [string | null, string | null, string | null]
  readonly parameterValues?: PuppetParameterValueMap
  readonly rotation?: readonly [number, number, number]
}

export const resolveSpatialRotation = (
  options: ResolveSpatialRotationOptions,
): [number, number, number] =>
  (options.rotation ?? [0, 0, 0]).map((angle, axis) => {
    const id = options.parameterIds?.[axis]
    const parameter = options.document.parameters?.find((candidate) => candidate.id === id)
    return (
      angle +
      (parameter === undefined
        ? 0
        : resolveParameterValue(parameter, options.parameterValues?.[parameter.id]))
    )
  }) as [number, number, number]

interface GetAttachedMeshPointsOptions {
  readonly attachments: ReadonlyArray<PuppetSpatialAttachment>
  readonly mesh: PuppetSpatialMesh
  readonly position: readonly [number, number, number]
  readonly restPosition: readonly [number, number, number]
}

const getAttachedMeshPoints = (
  options: GetAttachedMeshPointsOptions,
): ReadonlyArray<readonly [number, number, number] | undefined> => {
  const moved = options.position.some(
    (coordinate, index) => coordinate !== options.restPosition[index],
  )
  const sample = moved ? getSpatialMeshAttachmentSampler(options.mesh) : undefined
  return options.attachments.map((attachment) => {
    const localPoint = resolveSpatialMeshAttachment(options.mesh, attachment)
    const point =
      localPoint === undefined
        ? undefined
        : ([
            localPoint[0] + options.restPosition[0],
            localPoint[1] + options.restPosition[1],
            localPoint[2] + options.restPosition[2],
          ] as const)
    if (point === undefined || sample === undefined) {
      return point
    }
    const before = sample(point[0] - options.restPosition[0], point[1] - options.restPosition[1])
    const after = sample(point[0] - options.position[0], point[1] - options.position[1])
    return before === undefined || after === undefined
      ? point
      : [
          point[0],
          point[1],
          point[2] +
            after.point[2] -
            before.point[2] +
            options.position[2] -
            options.restPosition[2],
        ]
  })
}

const getMeshControlPoints = (
  part: PuppetPart,
  deformer: PuppetSceneDeformerNode | undefined,
  position: readonly [number, number, number] | undefined,
): ReadonlyArray<number> | undefined => {
  const mesh = deformer?.spatialMesh
  const {spatial} = part
  if (mesh === undefined || spatial === undefined) {
    return undefined
  }
  const restPosition = deformer?.spatialMeshPosition ?? ([0, 0, 0] as const)
  const attachments = spatial.attachments ?? getLegacyAttachments(spatial, mesh, restPosition)
  if (attachments === undefined) {
    return undefined
  }
  const points = getAttachedMeshPoints({
    attachments,
    mesh,
    position: position ?? restPosition,
    restPosition,
  })
  return points.length === part.mesh.vertices.length / 2 &&
    points.every((point) => point !== undefined)
    ? points.flatMap((point) => point!)
    : undefined
}

const signedArea = (vertices: ReadonlyArray<number>, indices: ReadonlyArray<number>) => {
  const [first, second, third] = indices
  if (first === undefined || second === undefined || third === undefined) {
    return 0
  }
  const firstIndex = first * 2
  const secondIndex = second * 2
  const thirdIndex = third * 2
  const x1 = vertices[secondIndex]! - vertices[firstIndex]!
  const y1 = vertices[secondIndex + 1]! - vertices[firstIndex + 1]!
  const x2 = vertices[thirdIndex]! - vertices[firstIndex]!
  const y2 = vertices[thirdIndex + 1]! - vertices[firstIndex + 1]!
  return x1 * y2 - y1 * x2
}

export const getSpatialPartPose = (
  options: GetSpatialPartPoseOptions,
): SpatialPartPose | undefined => {
  const {spatial} = options.part
  if (spatial === undefined) {
    return undefined
  }
  const findSpatialDeformer = (
    nodes: ReturnType<typeof getDocumentScene>['roots'],
  ): Extract<(typeof nodes)[number], {kind: 'deformer'}> | undefined => {
    for (const node of nodes) {
      if (
        node.kind === 'deformer' &&
        node.id === spatial.groupId &&
        node.deformerType === 'spatial'
      ) {
        return node
      }
      if (node.kind !== 'part') {
        const found = findSpatialDeformer(node.children)
        if (found !== undefined) {
          return found
        }
      }
    }
    return undefined
  }
  const sourceDeformer = findSpatialDeformer(getDocumentScene(options.document).roots)
  const deformer =
    options.posedScene === undefined
      ? sourceDeformer === undefined
        ? undefined
        : composeParameterDeformer(options.document, sourceDeformer, options.parameterValues)
      : findSpatialDeformer(options.posedScene.roots)
  const rotation = resolveSpatialRotation({
    document: options.document,
    parameterIds: deformer?.spatialRotationParameterIds ?? spatial.rotationParameterIds,
    parameterValues: options.parameterValues,
    rotation: deformer?.spatialRotation,
  })
  const controlPoints =
    getMeshControlPoints(options.part, sourceDeformer, deformer?.spatialMeshPosition) ??
    spatial.controlPoints
  const projection = projectSpatialSurface({
    rotation,
    scale: deformer?.spatialScale,
    surface: {
      ...spatial,
      controlPoints,
      origin: deformer?.spatialOrigin ?? spatial.origin,
    },
    translation: deformer?.spatialTranslation,
  })
  const sourceArea = signedArea(options.part.mesh.vertices, options.part.mesh.indices)
  const projectedArea = signedArea(projection.vertices, options.part.mesh.indices)
  return {
    ...projection,
    depth: projection.depths.reduce((sum, value) => sum + value, 0) / projection.depths.length,
    facing: projectedArea / sourceArea > FACING_AREA_RATIO,
  }
}
