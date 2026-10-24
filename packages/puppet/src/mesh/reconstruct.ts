import type {PuppetMesh} from '../player/document'
import {withBoundaryLoops} from './boundary'
import {
  doSegmentsCross,
  getEdgeKey,
  getMeshTriangles,
  getMeshVertex,
  getSignedArea,
  getTriangleEdgeRecords,
  type MeshPoint,
  type MeshTriangleIndices,
} from './geometry'

interface TriangleRecord {
  readonly index: number
  readonly triangle: MeshTriangleIndices
}

interface EdgeRecord {
  readonly firstIndex: number
  readonly secondIndex: number
  readonly triangles: ReadonlyArray<TriangleRecord>
}

interface EdgeFlip {
  readonly firstRecord: TriangleRecord
  readonly firstTriangle: MeshTriangleIndices
  readonly secondRecord: TriangleRecord
  readonly secondTriangle: MeshTriangleIndices
}

const ANGLE_EPSILON = 0.000_001
const MAXIMUM_FLIP_MULTIPLIER = 3

const getAngle = (origin: MeshPoint, first: MeshPoint, second: MeshPoint) => {
  const firstX = first.x - origin.x
  const firstY = first.y - origin.y
  const secondX = second.x - origin.x
  const secondY = second.y - origin.y
  const denominator = Math.hypot(firstX, firstY) * Math.hypot(secondX, secondY)

  if (denominator === 0) {
    return 0
  }

  const cosine = (firstX * secondX + firstY * secondY) / denominator
  return Math.acos(Math.max(-1, Math.min(1, cosine)))
}

const getTriangleScore = (mesh: PuppetMesh, triangle: MeshTriangleIndices) => {
  const first = getMeshVertex(mesh, triangle[0])
  const second = getMeshVertex(mesh, triangle[1])
  const third = getMeshVertex(mesh, triangle[2])

  return first === undefined || second === undefined || third === undefined
    ? 0
    : Math.min(
        getAngle(first, second, third),
        getAngle(second, first, third),
        getAngle(third, first, second),
      )
}

const orientTriangle = (
  mesh: PuppetMesh,
  triangle: MeshTriangleIndices,
  expectedArea: number,
): MeshTriangleIndices => {
  const first = getMeshVertex(mesh, triangle[0])
  const second = getMeshVertex(mesh, triangle[1])
  const third = getMeshVertex(mesh, triangle[2])
  const area =
    first === undefined || second === undefined || third === undefined
      ? 0
      : getSignedArea(first, second, third)

  return area * expectedArea < 0 ? [triangle[1], triangle[0], triangle[2]] : triangle
}

const getEdgeRecords = (triangles: ReadonlyArray<MeshTriangleIndices>) => {
  const records = new Map<string, EdgeRecord>()

  for (const record of getTriangleEdgeRecords(triangles)) {
    const {edge} = record
    const key = getEdgeKey(edge.firstIndex, edge.secondIndex)
    const existing = records.get(key)
    const triangleRecord = {index: record.triangleIndex, triangle: record.triangle}

    records.set(key, {
      firstIndex: edge.firstIndex,
      secondIndex: edge.secondIndex,
      triangles: [...(existing?.triangles ?? []), triangleRecord],
    })
  }

  return records
}

const getTriangleArea = (mesh: PuppetMesh, triangle: MeshTriangleIndices) => {
  const first = getMeshVertex(mesh, triangle[0])
  const second = getMeshVertex(mesh, triangle[1])
  const third = getMeshVertex(mesh, triangle[2])

  return first === undefined || second === undefined || third === undefined
    ? 0
    : getSignedArea(first, second, third)
}

const createEdgeFlip = (
  mesh: PuppetMesh,
  edge: EdgeRecord,
  edgeKeys: ReadonlySet<string>,
): EdgeFlip | undefined => {
  const [firstRecord, secondRecord] = edge.triangles

  if (firstRecord === undefined || secondRecord === undefined || edge.triangles.length !== 2) {
    return undefined
  }

  const firstOpposite = firstRecord.triangle.find(
    (index) => index !== edge.firstIndex && index !== edge.secondIndex,
  )
  const secondOpposite = secondRecord.triangle.find(
    (index) => index !== edge.firstIndex && index !== edge.secondIndex,
  )

  if (firstOpposite === undefined || secondOpposite === undefined) {
    return undefined
  }

  const firstPoint = getMeshVertex(mesh, edge.firstIndex)
  const secondPoint = getMeshVertex(mesh, edge.secondIndex)
  const firstOppositePoint = getMeshVertex(mesh, firstOpposite)
  const secondOppositePoint = getMeshVertex(mesh, secondOpposite)
  const replacementKey = getEdgeKey(firstOpposite, secondOpposite)

  if (
    firstPoint === undefined ||
    secondPoint === undefined ||
    firstOppositePoint === undefined ||
    secondOppositePoint === undefined ||
    edgeKeys.has(replacementKey) ||
    !doSegmentsCross(firstPoint, secondPoint, firstOppositePoint, secondOppositePoint)
  ) {
    return undefined
  }

  const firstTriangle = orientTriangle(
    mesh,
    [firstOpposite, secondOpposite, edge.firstIndex],
    getTriangleArea(mesh, firstRecord.triangle),
  )
  const secondTriangle = orientTriangle(
    mesh,
    [secondOpposite, firstOpposite, edge.secondIndex],
    getTriangleArea(mesh, secondRecord.triangle),
  )
  const currentScore = Math.min(
    getTriangleScore(mesh, firstRecord.triangle),
    getTriangleScore(mesh, secondRecord.triangle),
  )
  const replacementScore = Math.min(
    getTriangleScore(mesh, firstTriangle),
    getTriangleScore(mesh, secondTriangle),
  )

  return replacementScore > currentScore + ANGLE_EPSILON
    ? {firstRecord, firstTriangle, secondRecord, secondTriangle}
    : undefined
}

const findEdgeFlip = (
  mesh: PuppetMesh,
  triangles: ReadonlyArray<MeshTriangleIndices>,
): EdgeFlip | undefined => {
  const records = getEdgeRecords(triangles)
  const edgeKeys = new Set(records.keys())

  for (const edge of records.values()) {
    const flip = createEdgeFlip(mesh, edge, edgeKeys)

    if (flip !== undefined) {
      return flip
    }
  }

  return undefined
}

export const reconstructMesh = (mesh: PuppetMesh): PuppetMesh => {
  const triangles = [...getMeshTriangles(mesh)]
  const maximumFlips = triangles.length ** 2 * MAXIMUM_FLIP_MULTIPLIER
  let flipCount = 0
  let flip = findEdgeFlip(mesh, triangles)

  while (flip !== undefined && flipCount < maximumFlips) {
    triangles[flip.firstRecord.index] = flip.firstTriangle
    triangles[flip.secondRecord.index] = flip.secondTriangle
    flipCount += 1
    flip = findEdgeFlip(mesh, triangles)
  }

  return withBoundaryLoops({
    ...mesh,
    indices: triangles.flatMap((triangle) => triangle),
  })
}
