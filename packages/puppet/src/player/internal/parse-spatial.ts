import type {
  PuppetMesh,
  PuppetPart,
  PuppetScene,
  PuppetSceneNode,
  PuppetSpatialMesh,
  PuppetSpatialSurface,
} from '../document'

const COORDINATES_PER_VERTEX = 2
const COORDINATES_PER_POINT = 3
const ROTATION_AXES = 3
const WEIGHT_TOLERANCE = 0.00001

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value)

const isAttachment = (value: unknown): boolean => {
  if (!isRecord(value) || !isFiniteNumber(value.triangleIndex)) {
    return false
  }
  return (
    Number.isInteger(value.triangleIndex) &&
    value.triangleIndex >= 0 &&
    Array.isArray(value.weights) &&
    value.weights.length === COORDINATES_PER_POINT &&
    value.weights.every(
      (weight: unknown) => isFiniteNumber(weight) && weight >= -WEIGHT_TOLERANCE,
    ) &&
    Math.abs(value.weights.reduce((sum: number, weight: number) => sum + weight, 0) - 1) <
      WEIGHT_TOLERANCE &&
    Array.isArray(value.offset) &&
    value.offset.length === COORDINATES_PER_POINT &&
    value.offset.every(isFiniteNumber)
  )
}

export const isSpatialSurface = (value: unknown, mesh: PuppetMesh): value is PuppetSpatialSurface =>
  isRecord(value) &&
  Array.isArray(value.controlPoints) &&
  value.controlPoints.every(isFiniteNumber) &&
  value.controlPoints.length ===
    (mesh.vertices.length / COORDINATES_PER_VERTEX) * COORDINATES_PER_POINT &&
  (value.attachments === undefined ||
    (Array.isArray(value.attachments) &&
      value.attachments.length === mesh.vertices.length / COORDINATES_PER_VERTEX &&
      value.attachments.every(isAttachment))) &&
  (value.groupId === undefined ||
    (typeof value.groupId === 'string' && value.groupId.length > 0)) &&
  Array.isArray(value.origin) &&
  value.origin.length === COORDINATES_PER_POINT &&
  value.origin.every(isFiniteNumber) &&
  (value.rotationParameterIds === undefined ||
    (Array.isArray(value.rotationParameterIds) &&
      value.rotationParameterIds.length === ROTATION_AXES &&
      value.rotationParameterIds.every(
        (id: unknown) => id === null || (typeof id === 'string' && id.length > 0),
      )))

/** Verifies that persisted image links reference a present 3D control mesh. */
export const hasValidSpatialAttachments = (
  parts: ReadonlyArray<PuppetPart>,
  scene: PuppetScene | undefined,
): boolean => {
  const meshes = new Map<string, PuppetSpatialMesh>()
  const visit = (nodes: ReadonlyArray<PuppetSceneNode>) => {
    for (const node of nodes) {
      if (
        node.kind === 'deformer' &&
        node.deformerType === 'spatial' &&
        node.spatialMesh !== undefined
      ) {
        meshes.set(node.id, node.spatialMesh)
      }
      if (node.kind !== 'part') {
        visit(node.children)
      }
    }
  }
  visit(scene?.roots ?? [])
  return parts.every((part) => {
    const attachments = part.spatial?.attachments
    if (attachments === undefined) {
      return true
    }
    const mesh = meshes.get(part.spatial?.groupId ?? '')
    return (
      mesh !== undefined &&
      attachments.every(
        (attachment) => attachment.triangleIndex < mesh.indices.length / COORDINATES_PER_POINT,
      )
    )
  })
}
