import type {PuppetMesh} from '../player/document'

export interface MeshPoint {
  readonly x: number
  readonly y: number
}

export type MeshTriangleIndices = readonly [number, number, number]

export interface MeshEdge {
  readonly firstIndex: number
  readonly secondIndex: number
}

export interface MeshEdgeRecord {
  readonly edge: MeshEdge
  readonly triangle: MeshTriangleIndices
  readonly triangleIndex: number
}

const COORDINATES_PER_VERTEX = 2
const INDICES_PER_TRIANGLE = 3
const GEOMETRY_EPSILON = 0.000_001

export const getMeshVertex = (mesh: PuppetMesh, vertexIndex: number): MeshPoint | undefined => {
  const x = mesh.vertices[vertexIndex * COORDINATES_PER_VERTEX]
  const y = mesh.vertices[vertexIndex * COORDINATES_PER_VERTEX + 1]

  return x === undefined || y === undefined ? undefined : {x, y}
}

export const getMeshTriangles = (
  mesh: Pick<PuppetMesh, 'indices'>,
): ReadonlyArray<MeshTriangleIndices> => {
  const triangles: MeshTriangleIndices[] = []

  for (let index = 0; index < mesh.indices.length; index += INDICES_PER_TRIANGLE) {
    const firstIndex = mesh.indices[index]
    const secondIndex = mesh.indices[index + 1]
    const thirdIndex = mesh.indices[index + 2]

    if (firstIndex !== undefined && secondIndex !== undefined && thirdIndex !== undefined) {
      triangles.push([firstIndex, secondIndex, thirdIndex])
    }
  }

  return triangles
}

export const getEdgeKey = (firstIndex: number, secondIndex: number) =>
  firstIndex < secondIndex ? `${firstIndex}:${secondIndex}` : `${secondIndex}:${firstIndex}`

export const getTriangleEdges = (triangle: MeshTriangleIndices): ReadonlyArray<MeshEdge> => [
  {firstIndex: triangle[0], secondIndex: triangle[1]},
  {firstIndex: triangle[1], secondIndex: triangle[2]},
  {firstIndex: triangle[2], secondIndex: triangle[0]},
]

export const getTriangleEdgeRecords = (
  triangles: ReadonlyArray<MeshTriangleIndices>,
): ReadonlyArray<MeshEdgeRecord> =>
  triangles.flatMap((triangle, triangleIndex) =>
    getTriangleEdges(triangle).map((edge) => ({edge, triangle, triangleIndex})),
  )

export const getMeshEdgeRecords = (
  mesh: Pick<PuppetMesh, 'indices'>,
): ReadonlyArray<MeshEdgeRecord> => getTriangleEdgeRecords(getMeshTriangles(mesh))

export const getSignedArea = (first: MeshPoint, second: MeshPoint, third: MeshPoint) =>
  (second.x - first.x) * (third.y - first.y) - (second.y - first.y) * (third.x - first.x)

export const getDistanceSquared = (first: MeshPoint, second: MeshPoint) =>
  (first.x - second.x) ** 2 + (first.y - second.y) ** 2

export const isPointOnSegment = (point: MeshPoint, first: MeshPoint, second: MeshPoint) => {
  const area = Math.abs(getSignedArea(first, second, point))
  const length = Math.sqrt(getDistanceSquared(first, second))
  const tolerance = Math.max(1, length) * GEOMETRY_EPSILON

  return (
    area <= tolerance &&
    point.x >= Math.min(first.x, second.x) - GEOMETRY_EPSILON &&
    point.x <= Math.max(first.x, second.x) + GEOMETRY_EPSILON &&
    point.y >= Math.min(first.y, second.y) - GEOMETRY_EPSILON &&
    point.y <= Math.max(first.y, second.y) + GEOMETRY_EPSILON
  )
}

const hasOppositeSigns = (first: number, second: number) =>
  (first > GEOMETRY_EPSILON && second < -GEOMETRY_EPSILON) ||
  (first < -GEOMETRY_EPSILON && second > GEOMETRY_EPSILON)

export const doSegmentsCross = (
  firstStart: MeshPoint,
  firstEnd: MeshPoint,
  secondStart: MeshPoint,
  secondEnd: MeshPoint,
) => {
  const firstSide = getSignedArea(firstStart, firstEnd, secondStart)
  const secondSide = getSignedArea(firstStart, firstEnd, secondEnd)
  const thirdSide = getSignedArea(secondStart, secondEnd, firstStart)
  const fourthSide = getSignedArea(secondStart, secondEnd, firstEnd)

  return hasOppositeSigns(firstSide, secondSide) && hasOppositeSigns(thirdSide, fourthSide)
}

export const hasSamePoint = (first: MeshPoint, second: MeshPoint) =>
  getDistanceSquared(first, second) <= GEOMETRY_EPSILON ** 2

export const isDegenerateArea = (area: number) => Math.abs(area) <= GEOMETRY_EPSILON
