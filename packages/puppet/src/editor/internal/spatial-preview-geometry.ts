import {createSpatialMeshFrontPreview} from '../../deformation/create-spatial-mesh-preview'
import {generateSpatialMesh} from '../../deformation/generate-spatial-mesh'
import {placeSpatialMesh} from '../../deformation/bind-spatial-mesh'
import {projectSpatialSurface} from '../../deformation/project-spatial-surface'
import type {PuppetDocument, PuppetSceneDeformerNode, PuppetSpatialMesh} from '../../player'
import {resolveSpatialRotation} from '../../player/internal/spatial-part'
import {applySceneNodeAncestorsPoint} from './scene-deformation'
import {type EditorViewBox, getEditorViewBox} from './viewport'

const COORDINATES = 3
const FACE_LIMIT = 900
const PREVIEW_RESOLUTION = 10
const IMPORTED_PREVIEW_DIVISIONS = 32

export interface SpatialPreviewGeometry {
  readonly indices: Uint32Array
  readonly positions: Float32Array
  readonly viewBox: EditorViewBox
}

export interface SpatialPreviewGeometryOptions {
  readonly document: PuppetDocument
  readonly mesh: PuppetSpatialMesh
  readonly node: PuppetSceneDeformerNode
}

const pointKey = (positions: ArrayLike<number>, offset: number) =>
  `${positions[offset]}:${positions[offset + 1]}:${positions[offset + 2]}`

/** Keeps crease edges attached to their source vertices through subsequent pose updates. */
export const createSpatialPreviewEdgeIndices = (
  positions: Float32Array,
  indices: Uint32Array,
  thresholdAngle: number,
): Uint32Array => {
  const source = new BufferGeometry()
  source.setAttribute('position', new BufferAttribute(positions, COORDINATES))
  source.setIndex(new BufferAttribute(indices, 1))
  const visibleEdges = new EdgesGeometry(source, thresholdAngle)
  const edgePositions = visibleEdges.getAttribute('position').array
  const vertices = new Map<string, number>()
  for (let index = 0; index < positions.length; index += COORDINATES) {
    vertices.set(pointKey(positions, index), index / COORDINATES)
  }
  const edgeIndices: number[] = []
  for (let index = 0; index < edgePositions.length; index += COORDINATES * 2) {
    const start = vertices.get(pointKey(edgePositions, index))
    const end = vertices.get(pointKey(edgePositions, index + COORDINATES))
    if (start !== undefined && end !== undefined) {
      edgeIndices.push(start, end)
    }
  }
  visibleEdges.dispose()
  source.dispose()
  return new Uint32Array(edgeIndices)
}

/** Returns the lighter editing surface while retaining the applied source mesh. */
export const getSpatialPreviewMesh = (mesh: PuppetSpatialMesh): PuppetSpatialMesh => {
  if (mesh.source.kind === 'imported') {
    return mesh.indices.length / COORDINATES > FACE_LIMIT
      ? (createSpatialMeshFrontPreview(mesh, IMPORTED_PREVIEW_DIVISIONS) ?? mesh)
      : mesh
  }
  try {
    return mesh.source.kind === 'generated'
      ? generateSpatialMesh({operations: mesh.source.operations, resolution: PREVIEW_RESOLUTION})
      : generateSpatialMesh({objects: mesh.source.objects, resolution: PREVIEW_RESOLUTION})
  } catch {
    return mesh
  }
}

/** Projects a shared 3D control mesh into the editor canvas coordinate system. */
export const createSpatialPreviewGeometry = (
  options: SpatialPreviewGeometryOptions,
): SpatialPreviewGeometry => {
  const {document, mesh, node} = options
  const origin = node.spatialOrigin ?? [
    node.bounds.x + node.bounds.width / 2,
    node.bounds.y + node.bounds.height / 2,
    0,
  ]
  const placedMesh = placeSpatialMesh(mesh, node.spatialMeshPosition)
  const projection = projectSpatialSurface({
    rotation: resolveSpatialRotation({
      document,
      parameterIds: node.spatialRotationParameterIds,
      rotation: node.spatialRotation,
    }),
    scale: node.spatialScale,
    surface: {controlPoints: placedMesh.vertices, origin},
    translation: node.spatialTranslation,
  })
  const positions = new Float32Array(mesh.vertices.length)
  for (let index = 0; index < projection.depths.length; index += 1) {
    const point = applySceneNodeAncestorsPoint({
      document,
      nodeId: node.id,
      point: {x: projection.vertices[index * 2]!, y: projection.vertices[index * 2 + 1]!},
    })
    positions[index * COORDINATES] = point.x
    positions[index * COORDINATES + 1] = -point.y
    positions[index * COORDINATES + 2] = projection.depths[index]!
  }
  return {
    indices: new Uint32Array(mesh.indices),
    positions,
    viewBox: getEditorViewBox(document),
  }
}
import {BufferAttribute, BufferGeometry, EdgesGeometry} from 'three'
