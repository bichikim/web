import {
  getDocumentScene,
  type PuppetDocument,
  type PuppetMesh,
  type PuppetPart,
  type PuppetSpatialAttachment,
  type PuppetSpatialSurface,
} from '../../player'
import {createSpatialMeshAttachmentSampler} from '../../deformation/bind-spatial-mesh'
import {findNode} from './scene-tree'

const COORDINATES_PER_VERTEX = 2
const COORDINATES_PER_POINT = 3
type SpatialMeshSampler = ReturnType<typeof createSpatialMeshAttachmentSampler>

export interface ReconcileSpatialSurfaceOptions {
  readonly addedVertexIndex?: number
  readonly document?: PuppetDocument
  readonly mesh: PuppetMesh
  readonly part: PuppetPart
  readonly removedVertexIndex?: number
}

const getInsertedIndex = (options: ReconcileSpatialSurfaceOptions, oldCount: number) =>
  options.mesh.vertices.length / COORDINATES_PER_VERTEX === oldCount + 1
    ? (options.addedVertexIndex ?? oldCount)
    : undefined

const getPreviousIndex = (
  index: number,
  insertedIndex: number | undefined,
  removedIndex: number | undefined,
): number | undefined => {
  if (insertedIndex !== undefined && index >= insertedIndex) {
    return index === insertedIndex ? undefined : index - 1
  }
  return removedIndex !== undefined && index >= removedIndex ? index + 1 : index
}

const getSpatialMesh = (options: ReconcileSpatialSurfaceOptions) => {
  const groupId = options.part.spatial?.groupId
  if (groupId === undefined || options.document === undefined) {
    return undefined
  }
  const node = findNode(getDocumentScene(options.document).roots, groupId)
  return node?.kind === 'deformer' && node.deformerType === 'spatial'
    ? {mesh: node.spatialMesh, position: node.spatialMeshPosition ?? [0, 0, 0]}
    : undefined
}

const reconcileAttachments = (
  options: ReconcileSpatialSurfaceOptions,
  insertedIndex: number | undefined,
  sample: SpatialMeshSampler | undefined,
): ReadonlyArray<PuppetSpatialAttachment> | undefined => {
  const attachments = options.part.spatial?.attachments
  if (attachments === undefined) {
    return undefined
  }
  const nextCount = options.mesh.vertices.length / COORDINATES_PER_VERTEX
  const updated = Array.from({length: nextCount}, (_, index) => {
    const x = options.mesh.vertices[index * COORDINATES_PER_VERTEX]!
    const y = options.mesh.vertices[index * COORDINATES_PER_VERTEX + 1]!
    if (index === insertedIndex) {
      return sample?.(x, y)?.attachment
    }
    const oldIndex = getPreviousIndex(index, insertedIndex, options.removedVertexIndex)
    if (oldIndex === undefined) {
      return undefined
    }
    const previous = attachments[oldIndex]
    if (previous === undefined) {
      return undefined
    }
    const oldX = options.part.mesh.vertices[oldIndex * COORDINATES_PER_VERTEX]!
    const oldY = options.part.mesh.vertices[oldIndex * COORDINATES_PER_VERTEX + 1]!
    return {
      ...previous,
      offset: [
        previous.offset[0] + x - oldX,
        previous.offset[1] + y - oldY,
        previous.offset[2],
      ] as const,
    }
  })
  return updated.every((attachment) => attachment !== undefined)
    ? updated.filter(
        (attachment): attachment is PuppetSpatialAttachment => attachment !== undefined,
      )
    : undefined
}

interface AddControlPointOptions {
  readonly insertedIndex: number
  readonly options: ReconcileSpatialSurfaceOptions
  readonly points: number[]
  readonly sample: SpatialMeshSampler | undefined
  readonly spatialMesh: ReturnType<typeof getSpatialMesh>
}

const addControlPoint = (configuration: AddControlPointOptions) => {
  const {insertedIndex, options, points, sample, spatialMesh} = configuration
  const x = options.mesh.vertices[insertedIndex * COORDINATES_PER_VERTEX]!
  const y = options.mesh.vertices[insertedIndex * COORDINATES_PER_VERTEX + 1]!
  points.splice(
    insertedIndex * COORDINATES_PER_POINT,
    0,
    x,
    y,
    (sample?.(x, y)?.point[2] ?? 0) + (spatialMesh?.position[2] ?? 0),
  )
}

interface ReconcileControlPointsOptions {
  readonly insertedIndex: number | undefined
  readonly nextCount: number
  readonly oldCount: number
  readonly options: ReconcileSpatialSurfaceOptions
  readonly points: number[]
  readonly sample: SpatialMeshSampler | undefined
  readonly spatialMesh: ReturnType<typeof getSpatialMesh>
}

const reconcileControlPoints = (
  configuration: ReconcileControlPointsOptions,
): number[] | undefined => {
  const {insertedIndex, nextCount, oldCount, options, points, sample, spatialMesh} = configuration
  if (insertedIndex !== undefined) {
    addControlPoint({insertedIndex, options, points, sample, spatialMesh})
  } else if (nextCount === oldCount - 1 && options.removedVertexIndex !== undefined) {
    points.splice(options.removedVertexIndex * COORDINATES_PER_POINT, COORDINATES_PER_POINT)
  } else if (nextCount !== oldCount) {
    return undefined
  }
  for (let index = 0; index < nextCount; index += 1) {
    const oldIndex = getPreviousIndex(index, insertedIndex, options.removedVertexIndex)
    if (oldIndex !== undefined) {
      const oldX = options.part.mesh.vertices[oldIndex * COORDINATES_PER_VERTEX]
      const oldY = options.part.mesh.vertices[oldIndex * COORDINATES_PER_VERTEX + 1]
      const nextX = options.mesh.vertices[index * COORDINATES_PER_VERTEX]!
      const nextY = options.mesh.vertices[index * COORDINATES_PER_VERTEX + 1]!
      points[index * COORDINATES_PER_POINT] += oldX === undefined ? nextX : nextX - oldX
      points[index * COORDINATES_PER_POINT + 1] += oldY === undefined ? nextY : nextY - oldY
    }
  }
  return points
}

export const reconcileSpatialSurface = (
  options: ReconcileSpatialSurfaceOptions,
): PuppetSpatialSurface | undefined => {
  const {spatial} = options.part
  if (spatial === undefined) {
    return undefined
  }
  const oldCount = options.part.mesh.vertices.length / COORDINATES_PER_VERTEX
  const nextCount = options.mesh.vertices.length / COORDINATES_PER_VERTEX
  const insertedIndex = getInsertedIndex(options, oldCount)
  const spatialMesh = getSpatialMesh(options)
  const attachmentSample =
    spatialMesh?.mesh === undefined
      ? undefined
      : createSpatialMeshAttachmentSampler(spatialMesh.mesh)
  const sample =
    attachmentSample === undefined || spatialMesh === undefined
      ? undefined
      : (x: number, y: number) =>
          attachmentSample(x - spatialMesh.position[0], y - spatialMesh.position[1])
  const points = reconcileControlPoints({
    insertedIndex,
    nextCount,
    oldCount,
    options,
    points: [...spatial.controlPoints],
    sample,
    spatialMesh,
  })
  if (points === undefined) {
    return undefined
  }
  return {
    ...spatial,
    attachments: reconcileAttachments(options, insertedIndex, sample),
    controlPoints: points,
  }
}
