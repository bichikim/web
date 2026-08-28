import {
  getEdgeKey,
  getMeshEdgeRecords,
  getMeshTriangles,
  getMeshVertex,
  getSignedArea,
  getTriangleEdges,
  hasSamePoint,
  isDegenerateArea,
  isPointOnSegment,
  type MeshEdge,
  type MeshPoint,
  type MeshTriangleIndices,
  normalizeMesh,
  reconstructMesh,
  validateMesh,
} from '../mesh'
import type {PuppetDocument, PuppetMesh, PuppetPart} from '../player/document'
import {collapseBoundaryVertex, isBoundaryCorner} from './internal/collapse-boundary'
import {interpolateEdgeUv, interpolateTriangleUv} from './internal/interpolate-uv'
import {collapseMotionIndices, updateMotionIndices} from './internal/motion-tracks'
import {deduplicateTriangles} from './internal/triangles'
import {triangulatePolygon} from './internal/triangulate'

export type EditDocumentErrorCode =
  | 'duplicate-vertex'
  | 'edge-blocked'
  | 'edge-exists'
  | 'invalid-edge'
  | 'invalid-mesh'
  | 'invalid-position'
  | 'invalid-vertex'
  | 'inverted-triangle'
  | 'minimum-vertex-count'
  | 'missing-part'
  | 'outside-mesh'
  | 'would-remove-mesh'
export interface EditDocumentFailure {
  readonly error: {readonly code: EditDocumentErrorCode}
  readonly ok: false
}

export interface EditDocumentSuccess {
  readonly document: PuppetDocument
  readonly ok: true
  readonly vertexIndex?: number
}

export type EditDocumentResult = EditDocumentFailure | EditDocumentSuccess

export interface VertexPoint extends MeshPoint {}

export interface MovePartVertexOptions extends VertexPoint {
  readonly document: PuppetDocument
  readonly partId: string
  readonly vertexIndex: number
}

export interface AddPartVertexOptions extends VertexPoint {
  readonly document: PuppetDocument
  readonly partId: string
}

export interface SplitPartTriangleOptions extends AddPartVertexOptions {}

export interface DeletePartVertexOptions {
  readonly document: PuppetDocument
  readonly partId: string
  readonly vertexIndex: number
}

export interface EditPartEdgeOptions {
  readonly document: PuppetDocument
  readonly firstVertexIndex: number
  readonly partId: string
  readonly secondVertexIndex: number
}

type TriangleRecord = {readonly index: number; readonly triangle: MeshTriangleIndices}

const COORDINATES_PER_VERTEX = 2
const MINIMUM_RETAINED_VERTEX_COUNT = 4

const replacePart = (document: PuppetDocument, part: PuppetPart): PuppetDocument => ({
  ...document,
  parts: document.parts.map((candidate) => (candidate.id === part.id ? part : candidate)),
})

const getPart = (document: PuppetDocument, partId: string) =>
  document.parts.find((candidate) => candidate.id === partId)

const hasValidPosition = (point: VertexPoint) =>
  Number.isFinite(point.x) && Number.isFinite(point.y)

const hasValidVertexIndex = (mesh: PuppetMesh, vertexIndex: number) =>
  Number.isInteger(vertexIndex) &&
  vertexIndex >= 0 &&
  vertexIndex < mesh.vertices.length / COORDINATES_PER_VERTEX

const getTriangleRecords = (mesh: PuppetMesh): ReadonlyArray<TriangleRecord> =>
  getMeshTriangles(mesh).map((triangle, index) => ({index, triangle}))

const getTrianglePoints = (mesh: PuppetMesh, triangle: MeshTriangleIndices) => {
  const first = getMeshVertex(mesh, triangle[0])
  const second = getMeshVertex(mesh, triangle[1])
  const third = getMeshVertex(mesh, triangle[2])

  return first === undefined || second === undefined || third === undefined
    ? undefined
    : {first, second, third}
}

const isPointInTriangle = (mesh: PuppetMesh, triangle: MeshTriangleIndices, point: VertexPoint) => {
  const points = getTrianglePoints(mesh, triangle)

  if (points === undefined) {
    return false
  }

  const firstArea = getSignedArea(points.first, points.second, point)
  const secondArea = getSignedArea(points.second, points.third, point)
  const thirdArea = getSignedArea(points.third, points.first, point)
  const hasNegative = firstArea < 0 || secondArea < 0 || thirdArea < 0
  const hasPositive = firstArea > 0 || secondArea > 0 || thirdArea > 0

  return !(hasNegative && hasPositive)
}

const replaceTriangles = (
  mesh: PuppetMesh,
  replacements: ReadonlyMap<number, ReadonlyArray<MeshTriangleIndices>>,
): PuppetMesh => ({
  ...mesh,
  indices: getTriangleRecords(mesh).flatMap((record) =>
    (replacements.get(record.index) ?? [record.triangle]).flatMap((triangle) => triangle),
  ),
})

const appendVertex = (part: PuppetPart, point: VertexPoint, uv: MeshPoint) => ({
  mesh: {
    ...part.mesh,
    uvs: [...part.mesh.uvs, uv.x, uv.y],
    vertices: [...part.mesh.vertices, point.x, point.y],
  },
  vertexIndex: part.mesh.vertices.length / COORDINATES_PER_VERTEX,
})

const findPointEdge = (mesh: PuppetMesh, point: VertexPoint): MeshEdge | undefined => {
  const visitedEdges = new Set<string>()

  for (const record of getMeshEdgeRecords(mesh)) {
    const {edge} = record
    const key = getEdgeKey(edge.firstIndex, edge.secondIndex)
    const first = getMeshVertex(mesh, edge.firstIndex)
    const second = getMeshVertex(mesh, edge.secondIndex)

    if (
      !visitedEdges.has(key) &&
      first !== undefined &&
      second !== undefined &&
      isPointOnSegment(point, first, second)
    ) {
      return edge
    }

    visitedEdges.add(key)
  }

  return undefined
}

const splitEdge = (mesh: PuppetMesh, edge: MeshEdge, vertexIndex: number) => {
  const replacements = new Map<number, ReadonlyArray<MeshTriangleIndices>>()

  for (const record of getTriangleRecords(mesh)) {
    const matchingEdge = getTriangleEdges(record.triangle).find(
      (candidate) =>
        getEdgeKey(candidate.firstIndex, candidate.secondIndex) ===
        getEdgeKey(edge.firstIndex, edge.secondIndex),
    )

    if (matchingEdge !== undefined) {
      const oppositeIndex = record.triangle.find(
        (index) => index !== matchingEdge.firstIndex && index !== matchingEdge.secondIndex,
      )

      if (oppositeIndex !== undefined) {
        replacements.set(record.index, [
          [matchingEdge.firstIndex, vertexIndex, oppositeIndex],
          [vertexIndex, matchingEdge.secondIndex, oppositeIndex],
        ])
      }
    }
  }

  return replaceTriangles(mesh, replacements)
}

const splitTriangle = (mesh: PuppetMesh, record: TriangleRecord, vertexIndex: number) => {
  const [firstIndex, secondIndex, thirdIndex] = record.triangle
  return replaceTriangles(
    mesh,
    new Map([
      [
        record.index,
        [
          [firstIndex, secondIndex, vertexIndex],
          [secondIndex, thirdIndex, vertexIndex],
          [thirdIndex, firstIndex, vertexIndex],
        ],
      ],
    ]),
  )
}

const removeVertexData = (
  mesh: PuppetMesh,
  vertexIndex: number,
  indices: ReadonlyArray<number>,
) => {
  const coordinateOffset = vertexIndex * COORDINATES_PER_VERTEX
  const remapIndex = (index: number) => (index > vertexIndex ? index - 1 : index)

  return {
    indices: indices.map(remapIndex),
    uvs: [
      ...mesh.uvs.slice(0, coordinateOffset),
      ...mesh.uvs.slice(coordinateOffset + COORDINATES_PER_VERTEX),
    ],
    vertices: [
      ...mesh.vertices.slice(0, coordinateOffset),
      ...mesh.vertices.slice(coordinateOffset + COORDINATES_PER_VERTEX),
    ],
  }
}

const getSortedNeighbors = (mesh: PuppetMesh, vertexIndex: number) => {
  const center = getMeshVertex(mesh, vertexIndex)
  const neighbors = new Set<number>()

  for (const triangle of getMeshTriangles(mesh)) {
    if (triangle.includes(vertexIndex)) {
      for (const index of triangle) {
        if (index !== vertexIndex) {
          neighbors.add(index)
        }
      }
    }
  }

  return center === undefined
    ? []
    : [...neighbors].sort((firstIndex, secondIndex) => {
        const first = getMeshVertex(mesh, firstIndex)
        const second = getMeshVertex(mesh, secondIndex)
        const firstAngle =
          first === undefined ? 0 : Math.atan2(first.y - center.y, first.x - center.x)
        const secondAngle =
          second === undefined ? 0 : Math.atan2(second.y - center.y, second.x - center.x)
        return firstAngle - secondAngle
      })
}

const createPartResult = (
  document: PuppetDocument,
  part: PuppetPart,
  mesh: PuppetMesh,
  vertexIndex?: number,
): EditDocumentResult => {
  const normalizedMesh = normalizeMesh(mesh)
  const validation = validateMesh(normalizedMesh)

  return validation.valid
    ? {document: replacePart(document, {...part, mesh: normalizedMesh}), ok: true, vertexIndex}
    : {error: {code: 'invalid-mesh'}, ok: false}
}

export const addPartVertex = (options: AddPartVertexOptions): EditDocumentResult => {
  const part = getPart(options.document, options.partId)

  if (part === undefined) {
    return {error: {code: 'missing-part'}, ok: false}
  }

  if (!hasValidPosition(options)) {
    return {error: {code: 'invalid-position'}, ok: false}
  }

  if (!validateMesh(part.mesh).valid) {
    return {error: {code: 'invalid-mesh'}, ok: false}
  }

  const vertexCount = part.mesh.vertices.length / COORDINATES_PER_VERTEX
  const duplicateVertex = Array.from({length: vertexCount}, (_, index) =>
    getMeshVertex(part.mesh, index),
  ).some((point) => point !== undefined && hasSamePoint(point, options))

  if (duplicateVertex) {
    return {error: {code: 'duplicate-vertex'}, ok: false}
  }

  const edge = findPointEdge(part.mesh, options)
  const triangleRecord =
    edge === undefined
      ? getTriangleRecords(part.mesh).find((candidate) =>
          isPointInTriangle(part.mesh, candidate.triangle, options),
        )
      : undefined

  if (edge === undefined && triangleRecord === undefined) {
    return {error: {code: 'outside-mesh'}, ok: false}
  }

  const uv =
    edge === undefined
      ? triangleRecord === undefined
        ? undefined
        : interpolateTriangleUv(part.mesh, triangleRecord.triangle, options)
      : interpolateEdgeUv(part.mesh, edge, options)

  if (uv === undefined) {
    return {error: {code: 'invalid-mesh'}, ok: false}
  }

  const {mesh: appendedMesh, vertexIndex} = appendVertex(part, options, uv)
  const mesh =
    edge === undefined
      ? triangleRecord === undefined
        ? appendedMesh
        : splitTriangle(appendedMesh, triangleRecord, vertexIndex)
      : splitEdge(appendedMesh, edge, vertexIndex)

  return createPartResult(options.document, part, reconstructMesh(mesh), vertexIndex)
}

export const splitPartTriangle = (options: SplitPartTriangleOptions): EditDocumentResult =>
  addPartVertex(options)

export const movePartVertex = (options: MovePartVertexOptions): EditDocumentResult => {
  const part = getPart(options.document, options.partId)

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

  return invertedTriangle
    ? {error: {code: 'inverted-triangle'}, ok: false}
    : createPartResult(options.document, part, mesh)
}

export const deletePartVertex = (options: DeletePartVertexOptions): EditDocumentResult => {
  const part = getPart(options.document, options.partId)

  if (part === undefined) {
    return {error: {code: 'missing-part'}, ok: false}
  }

  if (!hasValidVertexIndex(part.mesh, options.vertexIndex)) {
    return {error: {code: 'invalid-vertex'}, ok: false}
  }

  if (!validateMesh(part.mesh).valid) {
    return {error: {code: 'invalid-mesh'}, ok: false}
  }

  const vertexCount = part.mesh.vertices.length / COORDINATES_PER_VERTEX

  if (vertexCount <= MINIMUM_RETAINED_VERTEX_COUNT) {
    return {error: {code: 'minimum-vertex-count'}, ok: false}
  }

  if (isBoundaryCorner(part.mesh, options.vertexIndex)) {
    const boundaryCollapse = collapseBoundaryVertex(part.mesh, options.vertexIndex)

    if (boundaryCollapse === undefined) {
      return {error: {code: 'invalid-mesh'}, ok: false}
    }

    const result = createPartResult(options.document, part, boundaryCollapse.mesh)

    return result.ok
      ? {
          ...result,
          document: {
            ...result.document,
            motions: collapseMotionIndices({
              deletedVertexIndex: options.vertexIndex,
              document: options.document,
              partId: part.id,
              promotedOffset: boundaryCollapse.promotedOffset,
              promotedVertexIndex: boundaryCollapse.promotedVertexIndex,
            }),
          },
        }
      : result
  }

  const deletionMesh = part.mesh
  const triangles = getMeshTriangles(deletionMesh)
  const remainingTriangles = triangles.filter((triangle) => !triangle.includes(options.vertexIndex))
  const neighbors = getSortedNeighbors(deletionMesh, options.vertexIndex)

  const replacementTriangles = triangulatePolygon(deletionMesh, neighbors)

  if (replacementTriangles === undefined) {
    return {error: {code: 'invalid-mesh'}, ok: false}
  }

  const nextTriangles = deduplicateTriangles([...remainingTriangles, ...replacementTriangles])

  if (nextTriangles.length === 0) {
    return {error: {code: 'would-remove-mesh'}, ok: false}
  }

  const mesh = removeVertexData(
    deletionMesh,
    options.vertexIndex,
    nextTriangles.flatMap((triangle) => triangle),
  )
  const result = createPartResult(options.document, part, reconstructMesh(mesh))

  return result.ok
    ? {
        ...result,
        document: {
          ...result.document,
          motions: updateMotionIndices(options.document, part.id, options.vertexIndex),
        },
      }
    : result
}
