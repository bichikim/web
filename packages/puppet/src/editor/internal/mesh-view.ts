import {getEdgeKey, getMeshEdgeRecords, getMeshTriangles, getMeshVertex} from '../../mesh'
import type {PuppetMesh} from '../../player/document'
import type {VertexPoint} from '../edit-document'

export interface IndexedVertex extends VertexPoint {
  readonly index: number
}

export interface MeshTriangle {
  readonly first: VertexPoint
  readonly index: number
  readonly second: VertexPoint
  readonly third: VertexPoint
}

export interface GetIndexedVerticesOptions {
  readonly draftPoint: VertexPoint | null
  readonly mesh: PuppetMesh
  readonly selectedVertex: number | null
}

export interface GetMeshViewTrianglesOptions {
  readonly mesh: Pick<PuppetMesh, 'indices'>
  readonly vertices: ReadonlyArray<IndexedVertex>
}

export interface SnapPointToEdgeOptions {
  readonly maximumDistance: number
  readonly mesh: PuppetMesh
  readonly point: VertexPoint
}

const COORDINATES_PER_VERTEX = 2

const projectPointToSegment = (
  point: VertexPoint,
  first: VertexPoint,
  second: VertexPoint,
): VertexPoint => {
  const horizontalDistance = second.x - first.x
  const verticalDistance = second.y - first.y
  const lengthSquared = horizontalDistance ** 2 + verticalDistance ** 2

  if (lengthSquared === 0) {
    return first
  }

  const progress = Math.max(
    0,
    Math.min(
      1,
      ((point.x - first.x) * horizontalDistance + (point.y - first.y) * verticalDistance) /
        lengthSquared,
    ),
  )

  return {
    x: first.x + horizontalDistance * progress,
    y: first.y + verticalDistance * progress,
  }
}

export const getIndexedVertices = (
  options: GetIndexedVerticesOptions,
): ReadonlyArray<IndexedVertex> => {
  const vertexCount = options.mesh.vertices.length / COORDINATES_PER_VERTEX

  return Array.from({length: vertexCount}, (_, index) => ({
    index,
    ...(options.selectedVertex === index && options.draftPoint !== null
      ? options.draftPoint
      : (getMeshVertex(options.mesh, index) ?? {x: 0, y: 0})),
  }))
}

export const getMeshViewTriangles = (
  options: GetMeshViewTrianglesOptions,
): ReadonlyArray<MeshTriangle> =>
  getMeshTriangles(options.mesh).flatMap((triangle, index) => {
    const first = options.vertices[triangle[0]]
    const second = options.vertices[triangle[1]]
    const third = options.vertices[triangle[2]]

    return first === undefined || second === undefined || third === undefined
      ? []
      : [{first, index, second, third}]
  })

export const snapPointToEdge = (options: SnapPointToEdgeOptions): VertexPoint => {
  const visitedEdges = new Set<string>()
  let closestPoint = options.point
  let closestDistanceSquared = options.maximumDistance ** 2

  for (const record of getMeshEdgeRecords(options.mesh)) {
    const {edge} = record
    const key = getEdgeKey(edge.firstIndex, edge.secondIndex)
    const first = getMeshVertex(options.mesh, edge.firstIndex)
    const second = getMeshVertex(options.mesh, edge.secondIndex)

    if (!visitedEdges.has(key) && first !== undefined && second !== undefined) {
      const projectedPoint = projectPointToSegment(options.point, first, second)
      const horizontalDistance = options.point.x - projectedPoint.x
      const verticalDistance = options.point.y - projectedPoint.y
      const distanceSquared = horizontalDistance ** 2 + verticalDistance ** 2

      if (distanceSquared <= closestDistanceSquared) {
        closestPoint = projectedPoint
        closestDistanceSquared = distanceSquared
      }
    }

    visitedEdges.add(key)
  }

  return closestPoint
}
