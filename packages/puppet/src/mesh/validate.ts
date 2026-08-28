import type {PuppetMesh} from '../player/document'
import {getBoundaryEdges} from './boundary'
import {
  doSegmentsCross,
  getEdgeKey,
  getMeshEdgeRecords,
  getMeshTriangles,
  getMeshVertex,
  getSignedArea,
  hasSamePoint,
  isDegenerateArea,
  type MeshEdge,
} from './geometry'

export type MeshIssueCode =
  | 'degenerate-triangle'
  | 'duplicate-triangle'
  | 'duplicate-vertex'
  | 'intersecting-edges'
  | 'invalid-boundary'
  | 'invalid-coordinate-count'
  | 'invalid-index'
  | 'invalid-uv-count'
  | 'non-manifold-edge'

export interface ValidMeshResult {
  readonly valid: true
}

export interface InvalidMeshResult {
  readonly issues: ReadonlyArray<MeshIssueCode>
  readonly valid: false
}

export type ValidateMeshResult = InvalidMeshResult | ValidMeshResult

interface IndexedEdge extends MeshEdge {
  readonly key: string
}

const COORDINATES_PER_VERTEX = 2
const INDICES_PER_TRIANGLE = 3
const MINIMUM_BOUNDARY_VERTEX_COUNT = 3

const collectEdges = (mesh: PuppetMesh) => {
  const edgeCount = new Map<string, number>()
  const edges = new Map<string, IndexedEdge>()

  for (const record of getMeshEdgeRecords(mesh)) {
    const {edge} = record
    const key = getEdgeKey(edge.firstIndex, edge.secondIndex)
    edgeCount.set(key, (edgeCount.get(key) ?? 0) + 1)
    edges.set(key, {...edge, key})
  }

  return {edgeCount, edges: [...edges.values()]}
}

const hasDuplicateVertices = (mesh: PuppetMesh, vertexCount: number) => {
  for (let firstIndex = 0; firstIndex < vertexCount; firstIndex += 1) {
    const first = getMeshVertex(mesh, firstIndex)

    for (let secondIndex = firstIndex + 1; secondIndex < vertexCount; secondIndex += 1) {
      const second = getMeshVertex(mesh, secondIndex)

      if (first !== undefined && second !== undefined && hasSamePoint(first, second)) {
        return true
      }
    }
  }

  return false
}

const hasIntersectingEdges = (mesh: PuppetMesh, edges: ReadonlyArray<IndexedEdge>) => {
  for (let firstIndex = 0; firstIndex < edges.length; firstIndex += 1) {
    const firstEdge = edges[firstIndex]

    if (firstEdge === undefined) {
      return false
    }

    for (let secondIndex = firstIndex + 1; secondIndex < edges.length; secondIndex += 1) {
      const secondEdge = edges[secondIndex]
      const sharesVertex =
        secondEdge === undefined ||
        firstEdge.firstIndex === secondEdge.firstIndex ||
        firstEdge.firstIndex === secondEdge.secondIndex ||
        firstEdge.secondIndex === secondEdge.firstIndex ||
        firstEdge.secondIndex === secondEdge.secondIndex

      if (!sharesVertex && secondEdge !== undefined) {
        const firstStart = getMeshVertex(mesh, firstEdge.firstIndex)
        const firstEnd = getMeshVertex(mesh, firstEdge.secondIndex)
        const secondStart = getMeshVertex(mesh, secondEdge.firstIndex)
        const secondEnd = getMeshVertex(mesh, secondEdge.secondIndex)

        if (
          firstStart !== undefined &&
          firstEnd !== undefined &&
          secondStart !== undefined &&
          secondEnd !== undefined &&
          doSegmentsCross(firstStart, firstEnd, secondStart, secondEnd)
        ) {
          return true
        }
      }
    }
  }

  return false
}

const hasValidBoundaryLoops = (mesh: PuppetMesh, vertexCount: number) => {
  if (mesh.boundaryLoops === undefined) {
    return true
  }

  const boundaryKeys = new Set(
    getBoundaryEdges(mesh).map((edge) => getEdgeKey(edge.firstIndex, edge.secondIndex)),
  )
  const loopKeys: string[] = []

  for (const loop of mesh.boundaryLoops) {
    const uniqueIndices = new Set(loop)
    const hasValidIndices = loop.every(
      (index) => Number.isInteger(index) && index >= 0 && index < vertexCount,
    )

    if (
      loop.length < MINIMUM_BOUNDARY_VERTEX_COUNT ||
      uniqueIndices.size !== loop.length ||
      !hasValidIndices
    ) {
      return false
    }

    for (let index = 0; index < loop.length; index += 1) {
      const firstIndex = loop[index]
      const secondIndex = loop[(index + 1) % loop.length]

      if (firstIndex === undefined || secondIndex === undefined) {
        return false
      }

      loopKeys.push(getEdgeKey(firstIndex, secondIndex))
    }
  }

  return (
    loopKeys.length === boundaryKeys.size &&
    new Set(loopKeys).size === loopKeys.length &&
    loopKeys.every((key) => boundaryKeys.has(key))
  )
}

const getMetadataIssues = (mesh: PuppetMesh, vertexCount: number): ReadonlyArray<MeshIssueCode> =>
  hasValidBoundaryLoops(mesh, vertexCount) ? [] : (['invalid-boundary'] as const)

export const validateMesh = (mesh: PuppetMesh): ValidateMeshResult => {
  const issues = new Set<MeshIssueCode>()
  const vertexCount = mesh.vertices.length / COORDINATES_PER_VERTEX
  const hasCoordinatePairs = Number.isInteger(vertexCount)

  if (!hasCoordinatePairs) {
    issues.add('invalid-coordinate-count')
  }

  if (mesh.uvs.length !== mesh.vertices.length) {
    issues.add('invalid-uv-count')
  }

  if (hasCoordinatePairs) {
    for (const issue of getMetadataIssues(mesh, vertexCount)) {
      issues.add(issue)
    }
  }

  const triangles = getMeshTriangles(mesh)
  const triangleKeys = new Set<string>()

  if (mesh.indices.length % INDICES_PER_TRIANGLE !== 0) {
    issues.add('invalid-index')
  }

  for (const triangle of triangles) {
    const hasValidIndices = triangle.every(
      (index) => Number.isInteger(index) && index >= 0 && index < vertexCount,
    )

    if (hasValidIndices) {
      const first = getMeshVertex(mesh, triangle[0])
      const second = getMeshVertex(mesh, triangle[1])
      const third = getMeshVertex(mesh, triangle[2])
      const key = [...triangle]
        .sort((firstIndex, secondIndex) => firstIndex - secondIndex)
        .join(':')

      if (
        first === undefined ||
        second === undefined ||
        third === undefined ||
        isDegenerateArea(getSignedArea(first, second, third))
      ) {
        issues.add('degenerate-triangle')
      }

      if (triangleKeys.has(key)) {
        issues.add('duplicate-triangle')
      }

      triangleKeys.add(key)
    } else {
      issues.add('invalid-index')
    }
  }

  if (hasCoordinatePairs && hasDuplicateVertices(mesh, vertexCount)) {
    issues.add('duplicate-vertex')
  }

  if (!issues.has('invalid-index')) {
    const {edgeCount, edges} = collectEdges(mesh)

    if ([...edgeCount.values()].some((count) => count > 2)) {
      issues.add('non-manifold-edge')
    }

    if (hasIntersectingEdges(mesh, edges)) {
      issues.add('intersecting-edges')
    }
  }

  return issues.size === 0 ? {valid: true} : {issues: [...issues], valid: false}
}
