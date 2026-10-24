import {getMeshVertex, type MeshEdge, type MeshPoint, type MeshTriangleIndices} from '../../mesh'
import type {PuppetMesh} from '../../player/document'

const COORDINATES_PER_VERTEX = 2

export const promoteVertexUv = (mesh: PuppetMesh, sourceIndex: number, targetIndex: number) => {
  const sourceOffset = sourceIndex * COORDINATES_PER_VERTEX
  const targetOffset = targetIndex * COORDINATES_PER_VERTEX
  const sourceUv = mesh.uvs.slice(sourceOffset, sourceOffset + COORDINATES_PER_VERTEX)

  if (sourceUv.length !== COORDINATES_PER_VERTEX) {
    return mesh
  }

  const uvs = [...mesh.uvs]
  uvs.splice(targetOffset, COORDINATES_PER_VERTEX, ...sourceUv)
  return {...mesh, uvs}
}

const getMeshUv = (mesh: PuppetMesh, vertexIndex: number): MeshPoint | undefined => {
  const x = mesh.uvs[vertexIndex * COORDINATES_PER_VERTEX]
  const y = mesh.uvs[vertexIndex * COORDINATES_PER_VERTEX + 1]

  return x === undefined || y === undefined ? undefined : {x, y}
}

export const interpolateEdgeUv = (
  mesh: PuppetMesh,
  edge: MeshEdge,
  point: MeshPoint,
): MeshPoint | undefined => {
  const first = getMeshVertex(mesh, edge.firstIndex)
  const second = getMeshVertex(mesh, edge.secondIndex)
  const firstUv = getMeshUv(mesh, edge.firstIndex)
  const secondUv = getMeshUv(mesh, edge.secondIndex)

  if (
    first === undefined ||
    second === undefined ||
    firstUv === undefined ||
    secondUv === undefined
  ) {
    return undefined
  }

  const horizontalDistance = second.x - first.x
  const verticalDistance = second.y - first.y
  const lengthSquared = horizontalDistance ** 2 + verticalDistance ** 2

  if (lengthSquared === 0) {
    return undefined
  }

  const progress =
    ((point.x - first.x) * horizontalDistance + (point.y - first.y) * verticalDistance) /
    lengthSquared

  return {
    x: firstUv.x + (secondUv.x - firstUv.x) * progress,
    y: firstUv.y + (secondUv.y - firstUv.y) * progress,
  }
}

export const interpolateTriangleUv = (
  mesh: PuppetMesh,
  triangle: MeshTriangleIndices,
  point: MeshPoint,
): MeshPoint | undefined => {
  const first = getMeshVertex(mesh, triangle[0])
  const second = getMeshVertex(mesh, triangle[1])
  const third = getMeshVertex(mesh, triangle[2])
  const firstUv = getMeshUv(mesh, triangle[0])
  const secondUv = getMeshUv(mesh, triangle[1])
  const thirdUv = getMeshUv(mesh, triangle[2])

  if (
    first === undefined ||
    second === undefined ||
    third === undefined ||
    firstUv === undefined ||
    secondUv === undefined ||
    thirdUv === undefined
  ) {
    return undefined
  }

  const horizontalSecond = second.x - first.x
  const verticalSecond = second.y - first.y
  const horizontalThird = third.x - first.x
  const verticalThird = third.y - first.y
  const horizontalPoint = point.x - first.x
  const verticalPoint = point.y - first.y
  const denominator = horizontalSecond * verticalThird - verticalSecond * horizontalThird

  if (denominator === 0) {
    return undefined
  }

  const secondWeight =
    (horizontalPoint * verticalThird - verticalPoint * horizontalThird) / denominator
  const thirdWeight =
    (horizontalSecond * verticalPoint - verticalSecond * horizontalPoint) / denominator
  const firstWeight = 1 - secondWeight - thirdWeight

  return {
    x: firstUv.x * firstWeight + secondUv.x * secondWeight + thirdUv.x * thirdWeight,
    y: firstUv.y * firstWeight + secondUv.y * secondWeight + thirdUv.y * thirdWeight,
  }
}
