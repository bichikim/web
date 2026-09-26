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

const getSpatialMesh = (options: ReconcileSpatialSurfaceOptions) => {
  const groupId = options.part.spatial?.groupId
  if (groupId === undefined || options.document === undefined) {
    return undefined
  }
  const node = findNode(getDocumentScene(options.document).roots, groupId)
  return node?.kind === 'deformer' && node.deformerType === 'spatial' ? node.spatialMesh : undefined
}

const reconcileAttachments = (
  options: ReconcileSpatialSurfaceOptions,
  insertedIndex: number | undefined,
): ReadonlyArray<PuppetSpatialAttachment> | undefined => {
  const attachments = options.part.spatial?.attachments
  if (attachments === undefined) {
    return undefined
  }
  const mesh = getSpatialMesh(options)
  const sample = mesh === undefined ? undefined : createSpatialMeshAttachmentSampler(mesh)
  const nextCount = options.mesh.vertices.length / COORDINATES_PER_VERTEX
  const updated = Array.from({length: nextCount}, (_, index) => {
    const x = options.mesh.vertices[index * COORDINATES_PER_VERTEX]!
    const y = options.mesh.vertices[index * COORDINATES_PER_VERTEX + 1]!
    if (index === insertedIndex) {
      return sample?.(x, y)?.attachment
    }
    const oldIndex =
      insertedIndex !== undefined && index > insertedIndex
        ? index - 1
        : options.removedVertexIndex !== undefined && index >= options.removedVertexIndex
          ? index + 1
          : index
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
  const points = [...spatial.controlPoints]
  const sample = getSpatialMesh(options)
  const attachmentSample =
    sample === undefined ? undefined : createSpatialMeshAttachmentSampler(sample)
  if (insertedIndex !== undefined) {
    const x = options.mesh.vertices[insertedIndex * COORDINATES_PER_VERTEX]!
    const y = options.mesh.vertices[insertedIndex * COORDINATES_PER_VERTEX + 1]!
    points.splice(
      insertedIndex * COORDINATES_PER_POINT,
      0,
      x,
      y,
      attachmentSample?.(x, y)?.point[2] ?? 0,
    )
  } else if (nextCount === oldCount - 1 && options.removedVertexIndex !== undefined) {
    points.splice(options.removedVertexIndex * COORDINATES_PER_POINT, COORDINATES_PER_POINT)
  } else if (nextCount !== oldCount) {
    return undefined
  }
  for (let index = 0; index < nextCount; index += 1) {
    const oldIndex =
      insertedIndex !== undefined && index >= insertedIndex
        ? index === insertedIndex
          ? undefined
          : index - 1
        : options.removedVertexIndex !== undefined && index >= options.removedVertexIndex
          ? index + 1
          : index
    if (oldIndex !== undefined) {
      const oldX = options.part.mesh.vertices[oldIndex * COORDINATES_PER_VERTEX]
      const oldY = options.part.mesh.vertices[oldIndex * COORDINATES_PER_VERTEX + 1]
      const nextX = options.mesh.vertices[index * COORDINATES_PER_VERTEX]!
      const nextY = options.mesh.vertices[index * COORDINATES_PER_VERTEX + 1]!
      points[index * COORDINATES_PER_POINT] += oldX === undefined ? nextX : nextX - oldX
      points[index * COORDINATES_PER_POINT + 1] += oldY === undefined ? nextY : nextY - oldY
    }
  }
  return {
    ...spatial,
    attachments: reconcileAttachments(options, insertedIndex),
    controlPoints: points,
  }
}
