import {
  getMeshTriangles,
  getMeshVertex,
  getSignedArea,
  hasSamePoint,
  isDegenerateArea,
  validateMesh,
} from '../mesh'
import type {EditDocumentResult, MovePartVertexOptions, VertexPoint} from './types'
import {createPartResult} from './internal/create-part-result'
import {getTrianglePoints} from './internal/get-triangle-points'
import {hasValidVertexIndex} from './internal/has-valid-vertex-index'

const COORDINATES_PER_VERTEX = 2

const hasValidPosition = (point: VertexPoint) =>
  Number.isFinite(point.x) && Number.isFinite(point.y)

export const movePartVertex = (options: MovePartVertexOptions): EditDocumentResult => {
  const part = options.document.parts.find((candidate) => candidate.id === options.partId)

  if (part === undefined) {
    return {error: {code: 'missing-part'}, ok: false}
  }

  if (!hasValidVertexIndex(part.mesh, options.vertexIndex)) {
    return {error: {code: 'invalid-vertex'}, ok: false}
  }

  if (!hasValidPosition(options)) {
    return {error: {code: 'invalid-position'}, ok: false}
  }

  if (!validateMesh(part.mesh).valid) {
    return {error: {code: 'invalid-mesh'}, ok: false}
  }

  const vertexCount = part.mesh.vertices.length / COORDINATES_PER_VERTEX
  const duplicateVertex = Array.from({length: vertexCount}, (_, index) => index)
    .filter((index) => index !== options.vertexIndex)
    .map((index) => getMeshVertex(part.mesh, index))
    .some((point) => point !== undefined && hasSamePoint(point, options))

  if (duplicateVertex) {
    return {error: {code: 'duplicate-vertex'}, ok: false}
  }

  const vertices = [...part.mesh.vertices]
  vertices[options.vertexIndex * COORDINATES_PER_VERTEX] = options.x
  vertices[options.vertexIndex * COORDINATES_PER_VERTEX + 1] = options.y
  const mesh = {...part.mesh, vertices}
  const invertedTriangle = getMeshTriangles(part.mesh)
    .filter((triangle) => triangle.includes(options.vertexIndex))
    .some((triangle) => {
      const previousPoints = getTrianglePoints(part.mesh, triangle)
      const nextPoints = getTrianglePoints(mesh, triangle)

      if (previousPoints === undefined || nextPoints === undefined) {
        return true
      }

      const previousArea = getSignedArea(
        previousPoints.first,
        previousPoints.second,
        previousPoints.third,
      )
      const nextArea = getSignedArea(nextPoints.first, nextPoints.second, nextPoints.third)

      return isDegenerateArea(nextArea) || previousArea * nextArea < 0
    })

  if (invertedTriangle) {
    return {error: {code: 'inverted-triangle'}, ok: false}
  }

  const previous = getMeshVertex(part.mesh, options.vertexIndex)!
  const offset = {x: options.x - previous.x, y: options.y - previous.y}
  const motions = options.document.motions.map((motion) => ({
    ...motion,
    tracks: motion.tracks.map((track) =>
      track.kind === 'vertex' &&
      track.partId === part.id &&
      track.vertexIndex === options.vertexIndex
        ? {
            ...track,
            keyframes: track.keyframes.map((keyframe) => ({
              ...keyframe,
              value: keyframe.value + offset[track.axis],
            })),
          }
        : track,
    ),
  }))
  return createPartResult({...options.document, motions}, part, mesh)
}
