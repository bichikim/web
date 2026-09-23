import {
  getEdgeKey,
  getMeshEdgeRecords,
  getMeshTriangles,
  getMeshVertex,
  getSignedArea,
  getTriangleEdges,
  hasSamePoint,
  isPointOnSegment,
  type MeshEdge,
  type MeshPoint,
  type MeshTriangleIndices,
  reconstructMesh,
  validateMesh,
} from '../mesh'
import type {PuppetMesh, PuppetPart} from '../player/document'
import type {AddPartVertexOptions, EditDocumentResult, VertexPoint} from './types'
import {createPartResult} from './internal/create-part-result'
import {getTrianglePoints} from './internal/get-triangle-points'
import {interpolateEdgeUv, interpolateTriangleUv} from './internal/interpolate-uv'
import {resetResultParameterVertices} from './internal/reset-result-parameter-vertices'

const COORDINATES_PER_VERTEX = 2

interface TriangleRecord {
  readonly index: number
  readonly triangle: MeshTriangleIndices
}

const hasValidPosition = (point: VertexPoint) =>
  Number.isFinite(point.x) && Number.isFinite(point.y)

const getTriangleRecords = (mesh: PuppetMesh): ReadonlyArray<TriangleRecord> =>
  getMeshTriangles(mesh).map((triangle, index) => ({index, triangle}))

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

export const addPartVertex = (options: AddPartVertexOptions): EditDocumentResult => {
  const part = options.document.parts.find((candidate) => candidate.id === options.partId)

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

  return resetResultParameterVertices(
    createPartResult(options.document, part, reconstructMesh(mesh), vertexIndex),
    part.id,
  )
}
