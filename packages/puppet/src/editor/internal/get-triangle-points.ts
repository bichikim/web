import {getMeshVertex, type MeshPoint, type MeshTriangleIndices} from '../../mesh'
import type {PuppetMesh} from '../../player/document'

interface TrianglePoints {
  readonly first: MeshPoint
  readonly second: MeshPoint
  readonly third: MeshPoint
}

export const getTrianglePoints = (
  mesh: PuppetMesh,
  triangle: MeshTriangleIndices,
): TrianglePoints | undefined => {
  const first = getMeshVertex(mesh, triangle[0])
  const second = getMeshVertex(mesh, triangle[1])
  const third = getMeshVertex(mesh, triangle[2])

  return first === undefined || second === undefined || third === undefined
    ? undefined
    : {first, second, third}
}
