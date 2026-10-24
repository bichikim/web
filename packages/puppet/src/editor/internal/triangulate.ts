import {
  getMeshVertex,
  getSignedArea,
  isDegenerateArea,
  isPointOnSegment,
  type MeshTriangleIndices,
} from '../../mesh'
import type {PuppetMesh} from '../../player/document'

const TRIANGLE_VERTEX_COUNT = 3

const getTriangleArea = (mesh: PuppetMesh, triangle: MeshTriangleIndices) => {
  const first = getMeshVertex(mesh, triangle[0])
  const second = getMeshVertex(mesh, triangle[1])
  const third = getMeshVertex(mesh, triangle[2])

  return first === undefined || second === undefined || third === undefined
    ? undefined
    : getSignedArea(first, second, third)
}

const isInsideTriangle = (mesh: PuppetMesh, triangle: MeshTriangleIndices, vertexIndex: number) => {
  const point = getMeshVertex(mesh, vertexIndex)
  const first = getMeshVertex(mesh, triangle[0])
  const second = getMeshVertex(mesh, triangle[1])
  const third = getMeshVertex(mesh, triangle[2])

  if (point === undefined || first === undefined || second === undefined || third === undefined) {
    return false
  }

  const firstArea = getSignedArea(first, second, point)
  const secondArea = getSignedArea(second, third, point)
  const thirdArea = getSignedArea(third, first, point)
  const hasNegative = firstArea < 0 || secondArea < 0 || thirdArea < 0
  const hasPositive = firstArea > 0 || secondArea > 0 || thirdArea > 0

  return !(hasNegative && hasPositive)
}

const getPolygonArea = (mesh: PuppetMesh, polygon: ReadonlyArray<number>) => {
  let doubledArea = 0

  for (let index = 0; index < polygon.length; index += 1) {
    const first = getMeshVertex(mesh, polygon[index] ?? -1)
    const second = getMeshVertex(mesh, polygon[(index + 1) % polygon.length] ?? -1)

    if (first === undefined || second === undefined) {
      return undefined
    }

    doubledArea += first.x * second.y - second.x * first.y
  }

  return doubledArea
}

const findCollinearIndex = (mesh: PuppetMesh, polygon: ReadonlyArray<number>) =>
  polygon.findIndex((vertexIndex, index) => {
    const previous = getMeshVertex(
      mesh,
      polygon[(index - 1 + polygon.length) % polygon.length] ?? -1,
    )
    const current = getMeshVertex(mesh, vertexIndex)
    const next = getMeshVertex(mesh, polygon[(index + 1) % polygon.length] ?? -1)

    return (
      previous !== undefined &&
      current !== undefined &&
      next !== undefined &&
      isDegenerateArea(getSignedArea(previous, current, next))
    )
  })

export const simplifyPolygon = (mesh: PuppetMesh, polygon: ReadonlyArray<number>) => {
  const simplified = [...polygon]
  let collinearIndex = findCollinearIndex(mesh, simplified)

  while (simplified.length > TRIANGLE_VERTEX_COUNT && collinearIndex >= 0) {
    simplified.splice(collinearIndex, 1)
    collinearIndex = findCollinearIndex(mesh, simplified)
  }

  return simplified
}

export const insertVertexIntoTriangulation = (
  mesh: PuppetMesh,
  triangles: ReadonlyArray<MeshTriangleIndices>,
  vertexIndex: number,
): ReadonlyArray<MeshTriangleIndices> | undefined => {
  const point = getMeshVertex(mesh, vertexIndex)

  if (point === undefined) {
    return undefined
  }

  const edgeMatches = triangles.flatMap((triangle, triangleIndex) => {
    const orientedEdges: ReadonlyArray<readonly [number, number, number]> = [
      [triangle[0], triangle[1], triangle[2]],
      [triangle[1], triangle[2], triangle[0]],
      [triangle[2], triangle[0], triangle[1]],
    ]

    return orientedEdges
      .filter(([firstIndex, secondIndex]) => {
        const first = getMeshVertex(mesh, firstIndex)
        const second = getMeshVertex(mesh, secondIndex)
        return first !== undefined && second !== undefined && isPointOnSegment(point, first, second)
      })
      .map(([firstIndex, secondIndex, oppositeIndex]) => ({
        firstIndex,
        oppositeIndex,
        secondIndex,
        triangleIndex,
      }))
  })

  if (edgeMatches.length > 0) {
    return triangles.flatMap((triangle, triangleIndex) => {
      const match = edgeMatches.find((candidate) => candidate.triangleIndex === triangleIndex)
      return match === undefined
        ? [triangle]
        : [
            [match.firstIndex, vertexIndex, match.oppositeIndex] as MeshTriangleIndices,
            [vertexIndex, match.secondIndex, match.oppositeIndex] as MeshTriangleIndices,
          ]
    })
  }

  const containingIndex = triangles.findIndex((triangle) =>
    isInsideTriangle(mesh, triangle, vertexIndex),
  )
  const containing = triangles[containingIndex]

  return containing === undefined
    ? undefined
    : triangles.flatMap((triangle, triangleIndex) =>
        triangleIndex === containingIndex
          ? [
              [triangle[0], triangle[1], vertexIndex] as MeshTriangleIndices,
              [triangle[1], triangle[2], vertexIndex] as MeshTriangleIndices,
              [triangle[2], triangle[0], vertexIndex] as MeshTriangleIndices,
            ]
          : [triangle],
      )
}

const triangulateRemaining = (
  mesh: PuppetMesh,
  polygon: ReadonlyArray<number>,
  expectedArea: number,
  failedPolygons: Set<string>,
): ReadonlyArray<MeshTriangleIndices> | undefined => {
  const failureKey = polygon.join(':')

  if (failedPolygons.has(failureKey)) {
    return undefined
  }

  if (polygon.length === TRIANGLE_VERTEX_COUNT) {
    const triangle: MeshTriangleIndices = [polygon[0]!, polygon[1]!, polygon[2]!]
    const area = getTriangleArea(mesh, triangle)
    return area !== undefined && !isDegenerateArea(area) && area * expectedArea > 0
      ? [triangle]
      : undefined
  }

  for (let index = 0; index < polygon.length; index += 1) {
    const previous = polygon[(index - 1 + polygon.length) % polygon.length]
    const current = polygon[index]
    const next = polygon[(index + 1) % polygon.length]

    if (previous !== undefined && current !== undefined && next !== undefined) {
      const triangle: MeshTriangleIndices = [previous, current, next]
      const area = getTriangleArea(mesh, triangle)
      const containsVertex = polygon.some(
        (vertexIndex) =>
          !triangle.includes(vertexIndex) && isInsideTriangle(mesh, triangle, vertexIndex),
      )

      if (
        area !== undefined &&
        !isDegenerateArea(area) &&
        area * expectedArea > 0 &&
        !containsVertex
      ) {
        const remaining = [...polygon]
        remaining.splice(index, 1)
        const rest = triangulateRemaining(mesh, remaining, expectedArea, failedPolygons)

        if (rest !== undefined) {
          return [triangle, ...rest]
        }
      }
    }
  }

  failedPolygons.add(failureKey)
  return undefined
}

export const triangulatePolygon = (
  mesh: PuppetMesh,
  polygon: ReadonlyArray<number>,
): ReadonlyArray<MeshTriangleIndices> | undefined => {
  const uniqueIndices = new Set(polygon)

  if (uniqueIndices.size !== polygon.length || polygon.length < TRIANGLE_VERTEX_COUNT) {
    return undefined
  }

  const simplified = simplifyPolygon(mesh, polygon)
  const expectedArea = getPolygonArea(mesh, simplified)

  if (expectedArea === undefined || isDegenerateArea(expectedArea)) {
    return undefined
  }

  let triangles = triangulateRemaining(mesh, simplified, expectedArea, new Set())

  if (triangles === undefined) {
    return undefined
  }

  const triangulatedIndices = new Set(simplified)
  const omittedIndices = polygon.filter((vertexIndex) => !triangulatedIndices.has(vertexIndex))

  for (const omittedIndex of omittedIndices) {
    const inserted = insertVertexIntoTriangulation(mesh, triangles, omittedIndex)

    if (inserted === undefined) {
      return undefined
    }

    triangles = inserted
  }

  return triangles
}
