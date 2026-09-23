import {getMeshTriangles, getMeshVertex, reconstructMesh, validateMesh} from '../mesh'
import type {PuppetMesh} from '../player/document'
import type {DeletePartVertexOptions, EditDocumentResult} from './types'
import {collapseBoundaryVertex, isBoundaryCorner} from './internal/collapse-boundary'
import {createPartResult} from './internal/create-part-result'
import {hasValidVertexIndex} from './internal/has-valid-vertex-index'
import {collapseMotionIndices, updateMotionIndices} from './internal/motion-tracks'
import {resetResultParameterVertices} from './internal/reset-result-parameter-vertices'
import {deduplicateTriangles} from './internal/triangles'
import {triangulatePolygon} from './internal/triangulate'

const COORDINATES_PER_VERTEX = 2

const MINIMUM_RETAINED_VERTEX_COUNT = 4

const removeVertexData = (
  mesh: PuppetMesh,
  vertexIndex: number,
  indices: ReadonlyArray<number>,
) => {
  const coordinateOffset = vertexIndex * COORDINATES_PER_VERTEX
  const remapIndex = (index: number) => (index > vertexIndex ? index - 1 : index)

  return {
    indices: indices.map(remapIndex),
    uvs: [
      ...mesh.uvs.slice(0, coordinateOffset),
      ...mesh.uvs.slice(coordinateOffset + COORDINATES_PER_VERTEX),
    ],
    vertices: [
      ...mesh.vertices.slice(0, coordinateOffset),
      ...mesh.vertices.slice(coordinateOffset + COORDINATES_PER_VERTEX),
    ],
  }
}

const getSortedNeighbors = (mesh: PuppetMesh, vertexIndex: number) => {
  const center = getMeshVertex(mesh, vertexIndex)
  const neighbors = new Set<number>()

  for (const triangle of getMeshTriangles(mesh)) {
    if (triangle.includes(vertexIndex)) {
      for (const index of triangle) {
        if (index !== vertexIndex) {
          neighbors.add(index)
        }
      }
    }
  }

  return center === undefined
    ? []
    : [...neighbors].sort((firstIndex, secondIndex) => {
        const first = getMeshVertex(mesh, firstIndex)
        const second = getMeshVertex(mesh, secondIndex)
        const firstAngle =
          first === undefined ? 0 : Math.atan2(first.y - center.y, first.x - center.x)
        const secondAngle =
          second === undefined ? 0 : Math.atan2(second.y - center.y, second.x - center.x)
        return firstAngle - secondAngle
      })
}

export const deletePartVertex = (options: DeletePartVertexOptions): EditDocumentResult => {
  const part = options.document.parts.find((candidate) => candidate.id === options.partId)

  if (part === undefined) {
    return {error: {code: 'missing-part'}, ok: false}
  }

  if (!hasValidVertexIndex(part.mesh, options.vertexIndex)) {
    return {error: {code: 'invalid-vertex'}, ok: false}
  }

  if (!validateMesh(part.mesh).valid) {
    return {error: {code: 'invalid-mesh'}, ok: false}
  }

  const vertexCount = part.mesh.vertices.length / COORDINATES_PER_VERTEX

  if (vertexCount <= MINIMUM_RETAINED_VERTEX_COUNT) {
    return {error: {code: 'minimum-vertex-count'}, ok: false}
  }

  if (isBoundaryCorner(part.mesh, options.vertexIndex)) {
    const boundaryCollapse = collapseBoundaryVertex(part.mesh, options.vertexIndex)

    if (boundaryCollapse === undefined) {
      return {error: {code: 'invalid-mesh'}, ok: false}
    }

    const result = createPartResult(options.document, part, boundaryCollapse.mesh)

    return resetResultParameterVertices(
      result.ok
        ? {
            ...result,
            document: {
              ...result.document,
              motions: collapseMotionIndices({
                deletedVertexIndex: options.vertexIndex,
                document: options.document,
                partId: part.id,
                promotedOffset: boundaryCollapse.promotedOffset,
                promotedVertexIndex: boundaryCollapse.promotedVertexIndex,
              }),
            },
          }
        : result,
      part.id,
    )
  }

  const deletionMesh = part.mesh
  const triangles = getMeshTriangles(deletionMesh)
  const remainingTriangles = triangles.filter((triangle) => !triangle.includes(options.vertexIndex))
  const neighbors = getSortedNeighbors(deletionMesh, options.vertexIndex)

  const replacementTriangles = triangulatePolygon(deletionMesh, neighbors)

  if (replacementTriangles === undefined) {
    return {error: {code: 'invalid-mesh'}, ok: false}
  }

  const nextTriangles = deduplicateTriangles([...remainingTriangles, ...replacementTriangles])

  if (nextTriangles.length === 0) {
    return {error: {code: 'would-remove-mesh'}, ok: false}
  }

  const mesh = removeVertexData(
    deletionMesh,
    options.vertexIndex,
    nextTriangles.flatMap((triangle) => triangle),
  )
  const result = createPartResult(options.document, part, reconstructMesh(mesh))

  return resetResultParameterVertices(
    result.ok
      ? {
          ...result,
          document: {
            ...result.document,
            motions: updateMotionIndices(options.document, part.id, options.vertexIndex),
          },
        }
      : result,
    part.id,
  )
}
