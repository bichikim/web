import {
  deriveBoundaryLoops,
  getDistanceSquared,
  getMeshTriangles,
  getMeshVertex,
  getSignedArea,
  isDegenerateArea,
  type MeshPoint,
  normalizeMesh,
  reconstructMesh,
  validateMesh,
} from '../../mesh'
import type {PuppetMesh} from '../../player/document'
import {insertVertexIntoTriangulation, triangulatePolygon} from './triangulate'

export interface BoundaryCollapse {
  readonly mesh: PuppetMesh
  readonly promotedOffset: MeshPoint
  readonly promotedVertexIndex: number
}

const COORDINATES_PER_VERTEX = 2
const MINIMUM_BOUNDARY_CORNER_COUNT = 4

const getConnectedIndices = (mesh: PuppetMesh, startingIndex: number) => {
  const connected = new Set([startingIndex])
  let previousSize = 0

  while (connected.size !== previousSize) {
    previousSize = connected.size

    for (const triangle of getMeshTriangles(mesh)) {
      if (triangle.some((index) => connected.has(index))) {
        for (const index of triangle) {
          connected.add(index)
        }
      }
    }
  }

  return connected
}

interface IsInsideCornerOptions {
  readonly deletedVertexIndex: number
  readonly mesh: PuppetMesh
  readonly nextIndex: number
  readonly previousIndex: number
  readonly vertexIndex: number
}

const getNextNeighbor = (
  neighbors: ReadonlyMap<number, ReadonlyArray<number>>,
  current: number,
  previous: number,
) => (neighbors.get(current) ?? []).find((candidate) => candidate !== previous)

const isInsideCorner = (options: IsInsideCornerOptions) => {
  const {deletedVertexIndex, mesh, nextIndex, previousIndex, vertexIndex} = options
  const point = getMeshVertex(mesh, vertexIndex)
  const previous = getMeshVertex(mesh, previousIndex)
  const deleted = getMeshVertex(mesh, deletedVertexIndex)
  const next = getMeshVertex(mesh, nextIndex)

  if (
    point === undefined ||
    previous === undefined ||
    deleted === undefined ||
    next === undefined
  ) {
    return false
  }

  const firstArea = getSignedArea(previous, deleted, point)
  const secondArea = getSignedArea(deleted, next, point)
  const thirdArea = getSignedArea(next, previous, point)
  const hasNegative = firstArea < 0 || secondArea < 0 || thirdArea < 0
  const hasPositive = firstArea > 0 || secondArea > 0 || thirdArea > 0

  return !(hasNegative && hasPositive)
}

const getReplacementChain = (
  mesh: PuppetMesh,
  boundary: ReadonlyArray<number>,
  deletedVertexIndex: number,
) => {
  const boundaryPosition = boundary.indexOf(deletedVertexIndex)
  const previousIndex = boundary[(boundaryPosition - 1 + boundary.length) % boundary.length]
  const nextIndex = boundary[(boundaryPosition + 1) % boundary.length]

  if (previousIndex === undefined || nextIndex === undefined) {
    return undefined
  }

  const neighbors = new Map<number, number[]>()

  for (const triangle of getMeshTriangles(mesh).filter((candidate) =>
    candidate.includes(deletedVertexIndex),
  )) {
    const oppositeEdge = triangle.filter((vertexIndex) => vertexIndex !== deletedVertexIndex)
    const [firstIndex, secondIndex] = oppositeEdge

    if (firstIndex !== undefined && secondIndex !== undefined) {
      neighbors.set(firstIndex, [...(neighbors.get(firstIndex) ?? []), secondIndex])
      neighbors.set(secondIndex, [...(neighbors.get(secondIndex) ?? []), firstIndex])
    }
  }

  const chain = [previousIndex]
  const boundaryIndices = new Set(boundary)
  let previous = deletedVertexIndex
  let current = previousIndex

  while (current !== nextIndex && chain.length <= neighbors.size + 1) {
    const following = getNextNeighbor(neighbors, current, previous)

    if (following === undefined) {
      return undefined
    }

    chain.push(following)
    previous = current
    current = following
  }

  return current === nextIndex
    ? chain.filter(
        (vertexIndex) =>
          vertexIndex === previousIndex ||
          vertexIndex === nextIndex ||
          (!boundaryIndices.has(vertexIndex) &&
            isInsideCorner({
              deletedVertexIndex,
              mesh,
              nextIndex,
              previousIndex,
              vertexIndex,
            })),
      )
    : undefined
}

const removeVertexData = (mesh: PuppetMesh, vertexIndex: number) => {
  const offset = vertexIndex * COORDINATES_PER_VERTEX
  const remapIndex = (index: number) => (index > vertexIndex ? index - 1 : index)

  return {
    indices: mesh.indices.map(remapIndex),
    uvs: [...mesh.uvs.slice(0, offset), ...mesh.uvs.slice(offset + COORDINATES_PER_VERTEX)],
    vertices: [
      ...mesh.vertices.slice(0, offset),
      ...mesh.vertices.slice(offset + COORDINATES_PER_VERTEX),
    ],
  }
}

const getSignedBoundaryArea = (mesh: PuppetMesh, boundary: ReadonlyArray<number>) => {
  let doubledArea = 0

  for (let index = 0; index < boundary.length; index += 1) {
    const first = getMeshVertex(mesh, boundary[index] ?? -1)
    const second = getMeshVertex(mesh, boundary[(index + 1) % boundary.length] ?? -1)

    if (first === undefined || second === undefined) {
      return undefined
    }

    doubledArea += first.x * second.y - second.x * first.y
  }

  return doubledArea / 2
}

const reorderCrossedBoundary = (
  mesh: PuppetMesh,
  boundary: ReadonlyArray<number>,
  expectedArea: number,
) => {
  const points = boundary.map((vertexIndex) => ({
    point: getMeshVertex(mesh, vertexIndex),
    vertexIndex,
  }))

  if (points.some(({point}) => point === undefined)) {
    return undefined
  }

  const center = points.reduce(
    (total, {point}) => ({x: total.x + point!.x, y: total.y + point!.y}),
    {x: 0, y: 0},
  )
  center.x /= points.length
  center.y /= points.length
  const reordered = [...points]
    .sort((first, second) => {
      const firstAngle = Math.atan2(first.point!.y - center.y, first.point!.x - center.x)
      const secondAngle = Math.atan2(second.point!.y - center.y, second.point!.x - center.x)
      const angleDifference = firstAngle - secondAngle

      return angleDifference === 0
        ? getDistanceSquared(first.point!, center) - getDistanceSquared(second.point!, center)
        : angleDifference
    })
    .map(({vertexIndex}) => vertexIndex)
  const reorderedArea = getSignedBoundaryArea(mesh, reordered)

  return reorderedArea !== undefined && reorderedArea * expectedArea < 0
    ? reordered.reverse()
    : reordered
}

export const retriangulateBoundaryDeletion = (
  mesh: PuppetMesh,
  deletedVertexIndex: number,
): PuppetMesh | undefined => {
  const componentWithDeleted = getConnectedIndices(mesh, deletedVertexIndex)
  const componentIndices = new Set(componentWithDeleted)
  componentIndices.delete(deletedVertexIndex)
  const sourceBoundary = deriveBoundaryLoops(mesh).find((loop) => loop.includes(deletedVertexIndex))

  if (sourceBoundary === undefined) {
    return undefined
  }

  const replacementChain = getReplacementChain(mesh, sourceBoundary, deletedVertexIndex)

  if (replacementChain === undefined) {
    return undefined
  }

  let boundary = sourceBoundary.flatMap((vertexIndex) => {
    if (vertexIndex !== deletedVertexIndex) {
      return [vertexIndex]
    }

    return replacementChain.slice(1, -1)
  })
  let triangles = triangulatePolygon(mesh, boundary)

  if (triangles === undefined) {
    const sourceArea = getSignedBoundaryArea(mesh, sourceBoundary)
    const reordered =
      sourceArea === undefined ? undefined : reorderCrossedBoundary(mesh, boundary, sourceArea)

    if (reordered === undefined) {
      return undefined
    }

    boundary = reordered
    triangles = triangulatePolygon(mesh, boundary)

    if (triangles === undefined) {
      return undefined
    }
  }

  const boundaryIndices = new Set(boundary)
  const insertionIndices = [...componentIndices].filter((index) => !boundaryIndices.has(index))

  for (const insertionIndex of insertionIndices) {
    const inserted = insertVertexIntoTriangulation(mesh, triangles, insertionIndex)

    if (inserted === undefined) {
      return undefined
    }

    triangles = inserted
  }

  const preservedTriangles = getMeshTriangles(mesh).filter(
    (triangle) => !triangle.some((vertexIndex) => componentWithDeleted.has(vertexIndex)),
  )
  const rebuilt = {
    ...mesh,
    indices: [...preservedTriangles, ...triangles].flatMap((triangle) => triangle),
  }
  const result = normalizeMesh(reconstructMesh(removeVertexData(rebuilt, deletedVertexIndex)))
  return validateMesh(result).valid ? result : undefined
}

const createPromotedMesh = (
  mesh: PuppetMesh,
  deletedVertexIndex: number,
  promotedVertexIndex: number,
  moveToDeletedPosition: boolean,
) => {
  const deletedOffset = deletedVertexIndex * COORDINATES_PER_VERTEX
  const promotedOffset = promotedVertexIndex * COORDINATES_PER_VERTEX
  const vertices = [...mesh.vertices]
  const uvs = [...mesh.uvs]
  const deletedUvs = uvs.slice(deletedOffset, deletedOffset + COORDINATES_PER_VERTEX)

  if (deletedUvs.length !== COORDINATES_PER_VERTEX) {
    return undefined
  }

  if (moveToDeletedPosition) {
    const deletedCoordinates = vertices.slice(deletedOffset, deletedOffset + COORDINATES_PER_VERTEX)

    if (deletedCoordinates.length !== COORDINATES_PER_VERTEX) {
      return undefined
    }

    vertices.splice(promotedOffset, COORDINATES_PER_VERTEX, ...deletedCoordinates)
  }

  uvs.splice(promotedOffset, COORDINATES_PER_VERTEX, ...deletedUvs)
  return {...mesh, uvs, vertices}
}

const getBoundaryArea = (mesh: PuppetMesh, boundary: ReadonlyArray<number>) => {
  let doubledArea = 0

  for (let index = 0; index < boundary.length; index += 1) {
    const first = getMeshVertex(mesh, boundary[index] ?? -1)
    const second = getMeshVertex(mesh, boundary[(index + 1) % boundary.length] ?? -1)

    if (first !== undefined && second !== undefined) {
      doubledArea += first.x * second.y - second.x * first.y
    }
  }

  return Math.abs(doubledArea) / 2
}

interface CollapseCandidate {
  readonly boundaryArea: number
  readonly boundaryVertexCount: number
  readonly distance: number
  readonly mesh: PuppetMesh
  readonly moved: boolean
  readonly promotionRank: number
  readonly promotedVertexIndex: number
}

interface ScoredCandidate extends CollapseCandidate {
  readonly cornerDeficit: number
  readonly outlineLoss: number
}

interface CreateCandidateOptions {
  readonly boundary: ReadonlyArray<number>
  readonly deletedVertexIndex: number
  readonly mesh: PuppetMesh
  readonly moved: boolean
  readonly promotedVertexIndex: number
}

const scoreCandidate = (originalArea: number, candidate: CollapseCandidate): ScoredCandidate => ({
  ...candidate,
  cornerDeficit: Math.max(0, MINIMUM_BOUNDARY_CORNER_COUNT - candidate.boundaryVertexCount),
  outlineLoss:
    originalArea === 0 ? 0 : Math.abs(originalArea - candidate.boundaryArea) / originalArea,
})

const compareCandidates = (first: ScoredCandidate, second: ScoredCandidate) =>
  first.cornerDeficit - second.cornerDeficit ||
  first.outlineLoss - second.outlineLoss ||
  Number(first.moved) - Number(second.moved) ||
  first.promotionRank - second.promotionRank ||
  first.distance - second.distance ||
  first.promotedVertexIndex - second.promotedVertexIndex

const createCandidate = (options: CreateCandidateOptions): CollapseCandidate | undefined => {
  const {boundary, deletedVertexIndex, mesh, moved, promotedVertexIndex} = options
  const deletedPoint = getMeshVertex(mesh, deletedVertexIndex)
  const promotedPoint = getMeshVertex(mesh, promotedVertexIndex)
  const promotedMesh = createPromotedMesh(mesh, deletedVertexIndex, promotedVertexIndex, moved)

  if (deletedPoint === undefined || promotedPoint === undefined || promotedMesh === undefined) {
    return undefined
  }

  const collapsedMesh = retriangulateBoundaryDeletion(promotedMesh, deletedVertexIndex)
  const nextPromotedIndex =
    promotedVertexIndex > deletedVertexIndex ? promotedVertexIndex - 1 : promotedVertexIndex
  const boundaryPosition = boundary.indexOf(deletedVertexIndex)
  const previousIndex = boundary[(boundaryPosition - 1 + boundary.length) % boundary.length] ?? -1
  const nextIndex = boundary[(boundaryPosition + 1) % boundary.length] ?? -1
  const remapIndex = (index: number) => (index > deletedVertexIndex ? index - 1 : index)
  const collapsedBoundary = deriveBoundaryLoops(collapsedMesh ?? {indices: []}).find(
    (loop) => loop.includes(remapIndex(previousIndex)) || loop.includes(remapIndex(nextIndex)),
  )
  const promotedOnBoundary = collapsedBoundary?.includes(nextPromotedIndex) === true
  const adjacentPosition = boundary.indexOf(promotedVertexIndex)
  const outerIndex =
    promotedVertexIndex === previousIndex
      ? boundary[(adjacentPosition - 1 + boundary.length) % boundary.length]
      : promotedVertexIndex === nextIndex
        ? boundary[(adjacentPosition + 1) % boundary.length]
        : undefined
  const outerPoint = getMeshVertex(mesh, outerIndex ?? -1)
  const continuesDeletedEdge =
    outerPoint !== undefined &&
    isDegenerateArea(getSignedArea(deletedPoint, promotedPoint, outerPoint))

  return collapsedMesh === undefined
    ? undefined
    : {
        boundaryArea: getBoundaryArea(collapsedMesh, collapsedBoundary ?? []),
        boundaryVertexCount: collapsedBoundary?.length ?? 0,
        distance: getDistanceSquared(deletedPoint, promotedPoint),
        mesh: collapsedMesh,
        moved,
        promotedVertexIndex,
        promotionRank: continuesDeletedEdge ? 0 : promotedOnBoundary ? 1 : 2,
      }
}

export const isBoundaryCorner = (mesh: PuppetMesh, vertexIndex: number) => {
  const boundary = deriveBoundaryLoops(mesh).find((loop) => loop.includes(vertexIndex))

  if (boundary === undefined) {
    return false
  }

  const position = boundary.indexOf(vertexIndex)
  const previous = getMeshVertex(
    mesh,
    boundary[(position - 1 + boundary.length) % boundary.length] ?? -1,
  )
  const current = getMeshVertex(mesh, vertexIndex)
  const next = getMeshVertex(mesh, boundary[(position + 1) % boundary.length] ?? -1)

  return (
    previous !== undefined &&
    current !== undefined &&
    next !== undefined &&
    !isDegenerateArea(getSignedArea(previous, current, next))
  )
}

export const collapseBoundaryVertex = (
  mesh: PuppetMesh,
  vertexIndex: number,
): BoundaryCollapse | undefined => {
  const boundary = deriveBoundaryLoops(mesh).find((loop) => loop.includes(vertexIndex))
  const deletedPoint = getMeshVertex(mesh, vertexIndex)

  if (boundary === undefined || deletedPoint === undefined) {
    return undefined
  }

  const boundaryPosition = boundary.indexOf(vertexIndex)
  const previousIndex = boundary[(boundaryPosition - 1 + boundary.length) % boundary.length] ?? -1
  const nextIndex = boundary[(boundaryPosition + 1) % boundary.length] ?? -1
  const connectedIndices = getConnectedIndices(mesh, vertexIndex)
  const connectedBoundaries = deriveBoundaryLoops(mesh).filter((loop) =>
    loop.some((index) => connectedIndices.has(index)),
  )

  if (connectedBoundaries.length !== 1) {
    return undefined
  }

  const boundaryIndices = new Set(boundary)
  const interiorIndices = [...connectedIndices].filter(
    (candidateIndex) => candidateIndex !== vertexIndex && !boundaryIndices.has(candidateIndex),
  )
  const candidateIndices = [...new Set([previousIndex, nextIndex, ...interiorIndices])]
  const stationaryCandidates = candidateIndices.map((candidateIndex) =>
    createCandidate({
      boundary,
      deletedVertexIndex: vertexIndex,
      mesh,
      moved: false,
      promotedVertexIndex: candidateIndex,
    }),
  )
  const movedCandidates = candidateIndices.map((candidateIndex) =>
    createCandidate({
      boundary,
      deletedVertexIndex: vertexIndex,
      mesh,
      moved: true,
      promotedVertexIndex: candidateIndex,
    }),
  )
  const candidates = [...stationaryCandidates, ...movedCandidates]
    .filter((candidate) => candidate !== undefined)
    .map((candidate) => scoreCandidate(getBoundaryArea(mesh, boundary), candidate))
    .sort(compareCandidates)
  const [selected] = candidates

  if (selected === undefined) {
    return undefined
  }

  const promotedPoint = getMeshVertex(mesh, selected.promotedVertexIndex)

  if (promotedPoint === undefined) {
    return undefined
  }

  return {
    mesh: selected.mesh,
    promotedOffset: selected.moved
      ? {x: deletedPoint.x - promotedPoint.x, y: deletedPoint.y - promotedPoint.y}
      : {x: 0, y: 0},
    promotedVertexIndex: selected.promotedVertexIndex,
  }
}
