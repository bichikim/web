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
  type MeshPoint,
  type MeshTriangleIndices,
} from './geometry'
import {GEOMETRY_EPSILON} from './internal/constants'

export type MeshIssueCode =
  | 'degenerate-triangle'
  | 'duplicate-triangle'
  | 'duplicate-vertex'
  | 'intersecting-edges'
  | 'intersecting-triangles'
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

interface BoundingBox {
  readonly maximumX: number
  readonly maximumY: number
  readonly minimumX: number
  readonly minimumY: number
}

interface BoundedEdge extends IndexedEdge {
  readonly bounds: BoundingBox
  readonly first: MeshPoint
  readonly second: MeshPoint
}

interface BoundedTriangle {
  readonly bounds: BoundingBox
  readonly triangle: MeshTriangleIndices
}

interface TriangleBranch {
  readonly bounds: BoundingBox
  readonly commonIndices: ReadonlyArray<number>
  readonly first: TriangleTree
  readonly kind: 'branch'
  readonly second: TriangleTree
}

interface TriangleLeaf {
  readonly bounds: BoundingBox
  readonly commonIndices: ReadonlyArray<number>
  readonly kind: 'leaf'
  readonly triangle: MeshTriangleIndices
}

type TriangleTree = TriangleBranch | TriangleLeaf

const COORDINATES_PER_VERTEX = 2
const INDICES_PER_TRIANGLE = 3
const MINIMUM_BOUNDARY_VERTEX_COUNT = 3

const getBoundingBox = (points: readonly [MeshPoint, ...MeshPoint[]]): BoundingBox => {
  let maximumX = points[0].x
  let maximumY = points[0].y
  let minimumX = points[0].x
  let minimumY = points[0].y

  for (const point of points) {
    maximumX = Math.max(maximumX, point.x)
    maximumY = Math.max(maximumY, point.y)
    minimumX = Math.min(minimumX, point.x)
    minimumY = Math.min(minimumY, point.y)
  }

  return {maximumX, maximumY, minimumX, minimumY}
}

const overlapsVertically = (first: BoundingBox, second: BoundingBox) =>
  first.minimumY <= second.maximumY && second.minimumY <= first.maximumY

const mergeBoundingBoxes = (first: BoundingBox, second: BoundingBox): BoundingBox => ({
  maximumX: Math.max(first.maximumX, second.maximumX),
  maximumY: Math.max(first.maximumY, second.maximumY),
  minimumX: Math.min(first.minimumX, second.minimumX),
  minimumY: Math.min(first.minimumY, second.minimumY),
})

const containsPoint = (bounds: BoundingBox, point: MeshPoint) =>
  point.x >= bounds.minimumX &&
  point.x <= bounds.maximumX &&
  point.y >= bounds.minimumY &&
  point.y <= bounds.maximumY

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
  const vertices: MeshPoint[] = []

  for (let index = 0; index < vertexCount; index += 1) {
    const vertex = getMeshVertex(mesh, index)

    if (vertex !== undefined) {
      vertices.push(vertex)
    }
  }

  vertices.sort((first, second) => first.x - second.x)

  for (const [firstIndex, first] of vertices.entries()) {
    let secondIndex = firstIndex + 1
    let second = vertices[secondIndex]

    while (second !== undefined && second.x - first.x <= GEOMETRY_EPSILON) {
      if (hasSamePoint(first, second)) {
        return true
      }

      secondIndex += 1
      second = vertices[secondIndex]
    }
  }

  return false
}

const getBoundedEdges = (
  mesh: PuppetMesh,
  edges: ReadonlyArray<IndexedEdge>,
): ReadonlyArray<BoundedEdge> => {
  const boundedEdges: BoundedEdge[] = []

  for (const edge of edges) {
    const first = getMeshVertex(mesh, edge.firstIndex)
    const second = getMeshVertex(mesh, edge.secondIndex)

    if (first !== undefined && second !== undefined) {
      boundedEdges.push({...edge, bounds: getBoundingBox([first, second]), first, second})
    }
  }

  return boundedEdges.sort((first, second) => first.bounds.minimumX - second.bounds.minimumX)
}

const hasIntersectingEdges = (mesh: PuppetMesh, edges: ReadonlyArray<IndexedEdge>) => {
  const boundedEdges = getBoundedEdges(mesh, edges)

  for (const [firstIndex, firstEdge] of boundedEdges.entries()) {
    let secondIndex = firstIndex + 1
    let secondEdge = boundedEdges[secondIndex]

    while (secondEdge !== undefined && secondEdge.bounds.minimumX <= firstEdge.bounds.maximumX) {
      const sharesVertex =
        firstEdge.firstIndex === secondEdge.firstIndex ||
        firstEdge.firstIndex === secondEdge.secondIndex ||
        firstEdge.secondIndex === secondEdge.firstIndex ||
        firstEdge.secondIndex === secondEdge.secondIndex

      if (
        !sharesVertex &&
        overlapsVertically(firstEdge.bounds, secondEdge.bounds) &&
        doSegmentsCross(firstEdge.first, firstEdge.second, secondEdge.first, secondEdge.second)
      ) {
        return true
      }

      secondIndex += 1
      secondEdge = boundedEdges[secondIndex]
    }
  }

  return false
}

const isVertexStrictlyInsideTriangle = (
  mesh: PuppetMesh,
  triangle: readonly [number, number, number],
  vertexIndex: number,
) => {
  const point = getMeshVertex(mesh, vertexIndex)
  const first = getMeshVertex(mesh, triangle[0])
  const second = getMeshVertex(mesh, triangle[1])
  const third = getMeshVertex(mesh, triangle[2])

  if (point === undefined || first === undefined || second === undefined || third === undefined) {
    return false
  }

  const areas = [
    getSignedArea(first, second, point),
    getSignedArea(second, third, point),
    getSignedArea(third, first, point),
  ]

  return (
    !areas.some(isDegenerateArea) &&
    (areas.every((area) => area > 0) || areas.every((area) => area < 0))
  )
}

const getTriangleTree = (triangles: ReadonlyArray<BoundedTriangle>): TriangleTree | undefined => {
  const [firstTriangle] = triangles

  if (firstTriangle === undefined) {
    return undefined
  }

  if (triangles.length === 1) {
    return {
      bounds: firstTriangle.bounds,
      commonIndices: firstTriangle.triangle,
      kind: 'leaf',
      triangle: firstTriangle.triangle,
    }
  }

  const bounds = triangles
    .slice(1)
    .reduce(
      (combined, triangle) => mergeBoundingBoxes(combined, triangle.bounds),
      firstTriangle.bounds,
    )
  const splitOnX = bounds.maximumX - bounds.minimumX >= bounds.maximumY - bounds.minimumY
  const sorted = [...triangles].sort((first, second) => {
    const firstCenter = splitOnX
      ? first.bounds.minimumX + first.bounds.maximumX
      : first.bounds.minimumY + first.bounds.maximumY
    const secondCenter = splitOnX
      ? second.bounds.minimumX + second.bounds.maximumX
      : second.bounds.minimumY + second.bounds.maximumY

    return firstCenter - secondCenter
  })
  const middleIndex = Math.floor(sorted.length / 2)
  const first = getTriangleTree(sorted.slice(0, middleIndex))
  const second = getTriangleTree(sorted.slice(middleIndex))

  if (first === undefined || second === undefined) {
    throw new Error('Triangle tree branches require non-empty children')
  }

  return {
    bounds,
    commonIndices: first.commonIndices.filter((index) => second.commonIndices.includes(index)),
    first,
    kind: 'branch',
    second,
  }
}

const hasContainingTriangle = (
  mesh: PuppetMesh,
  tree: TriangleTree,
  vertexIndex: number,
  point: MeshPoint,
): boolean => {
  if (tree.commonIndices.includes(vertexIndex) || !containsPoint(tree.bounds, point)) {
    return false
  }

  if (tree.kind === 'leaf') {
    return isVertexStrictlyInsideTriangle(mesh, tree.triangle, vertexIndex)
  }

  return (
    hasContainingTriangle(mesh, tree.first, vertexIndex, point) ||
    hasContainingTriangle(mesh, tree.second, vertexIndex, point)
  )
}

const hasIntersectingTriangles = (mesh: PuppetMesh) => {
  const boundedTriangles: BoundedTriangle[] = []
  const triangles = getMeshTriangles(mesh)

  for (const triangle of triangles) {
    const first = getMeshVertex(mesh, triangle[0])
    const second = getMeshVertex(mesh, triangle[1])
    const third = getMeshVertex(mesh, triangle[2])

    if (first !== undefined && second !== undefined && third !== undefined) {
      boundedTriangles.push({bounds: getBoundingBox([first, second, third]), triangle})
    }
  }

  const tree = getTriangleTree(boundedTriangles)

  if (tree === undefined) {
    return false
  }

  const vertexIndices = new Set(triangles.flatMap((triangle) => triangle))

  for (const vertexIndex of vertexIndices) {
    const point = getMeshVertex(mesh, vertexIndex)

    if (point !== undefined && hasContainingTriangle(mesh, tree, vertexIndex, point)) {
      return true
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

    if (hasIntersectingTriangles(mesh)) {
      issues.add('intersecting-triangles')
    }
  }

  return issues.size === 0 ? {valid: true} : {issues: [...issues], valid: false}
}
