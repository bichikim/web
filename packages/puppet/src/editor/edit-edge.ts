import {
  doSegmentsCross,
  getEdgeKey,
  getMeshEdgeRecords,
  getMeshTriangles,
  getMeshVertex,
  getSignedArea,
  getTriangleEdges,
  type MeshEdge,
  type MeshTriangleIndices,
  normalizeMesh,
  validateMesh,
} from '../mesh'
import type {PuppetDocument, PuppetMesh, PuppetPart} from '../player/document'
import {type EditDocumentResult, type EditPartEdgeOptions, movePartVertex} from './edit-document'

interface TriangleRecord {
  readonly index: number
  readonly triangle: MeshTriangleIndices
}

const COORDINATES_PER_VERTEX = 2
const INDICES_PER_TRIANGLE = 3
const MINIMUM_VERTEX_COUNT = 3
const MAXIMUM_EDGE_FLIPS = 10_000

const getPart = (document: PuppetDocument, partId: string) =>
  document.parts.find((candidate) => candidate.id === partId)

const replacePart = (document: PuppetDocument, part: PuppetPart): PuppetDocument => ({
  ...document,
  parts: document.parts.map((candidate) => (candidate.id === part.id ? part : candidate)),
})

const hasValidVertexIndex = (mesh: PuppetMesh, vertexIndex: number) =>
  Number.isInteger(vertexIndex) &&
  vertexIndex >= 0 &&
  vertexIndex < mesh.vertices.length / COORDINATES_PER_VERTEX

const getTriangleRecords = (mesh: PuppetMesh): ReadonlyArray<TriangleRecord> =>
  getMeshTriangles(mesh).map((triangle, index) => ({index, triangle}))

const getTriangleArea = (mesh: PuppetMesh, triangle: MeshTriangleIndices) => {
  const first = getMeshVertex(mesh, triangle[0])
  const second = getMeshVertex(mesh, triangle[1])
  const third = getMeshVertex(mesh, triangle[2])

  return first === undefined || second === undefined || third === undefined
    ? undefined
    : getSignedArea(first, second, third)
}

const orientTriangle = (
  mesh: PuppetMesh,
  triangle: MeshTriangleIndices,
  expectedArea: number,
): MeshTriangleIndices => {
  const area = getTriangleArea(mesh, triangle)

  return area !== undefined && area * expectedArea < 0
    ? [triangle[1], triangle[0], triangle[2]]
    : triangle
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

const createPartResult = (
  document: PuppetDocument,
  part: PuppetPart,
  mesh: PuppetMesh,
): EditDocumentResult => {
  const normalizedMesh = normalizeMesh(mesh)

  return validateMesh(normalizedMesh).valid
    ? {document: replacePart(document, {...part, mesh: normalizedMesh}), ok: true}
    : {error: {code: 'invalid-mesh'}, ok: false}
}

const hasMeshEdge = (mesh: PuppetMesh, firstIndex: number, secondIndex: number) =>
  getMeshTriangles(mesh).some((triangle) =>
    getTriangleEdges(triangle).some(
      (edge) =>
        getEdgeKey(edge.firstIndex, edge.secondIndex) === getEdgeKey(firstIndex, secondIndex),
    ),
  )

const flipMeshEdge = (
  mesh: PuppetMesh,
  firstVertexIndex: number,
  secondVertexIndex: number,
): PuppetMesh | undefined => {
  const edgeKey = getEdgeKey(firstVertexIndex, secondVertexIndex)
  const adjacent = getTriangleRecords(mesh).filter((record) =>
    getTriangleEdges(record.triangle).some(
      (edge) => getEdgeKey(edge.firstIndex, edge.secondIndex) === edgeKey,
    ),
  )

  if (adjacent.length !== 2) {
    return undefined
  }

  const [firstRecord, secondRecord] = adjacent

  if (firstRecord === undefined || secondRecord === undefined) {
    return undefined
  }

  const firstOpposite = firstRecord.triangle.find(
    (index) => index !== firstVertexIndex && index !== secondVertexIndex,
  )
  const secondOpposite = secondRecord.triangle.find(
    (index) => index !== firstVertexIndex && index !== secondVertexIndex,
  )
  const firstArea = getTriangleArea(mesh, firstRecord.triangle)
  const secondArea = getTriangleArea(mesh, secondRecord.triangle)

  if (
    firstOpposite === undefined ||
    secondOpposite === undefined ||
    firstArea === undefined ||
    secondArea === undefined ||
    hasMeshEdge(mesh, firstOpposite, secondOpposite)
  ) {
    return undefined
  }

  const result = replaceTriangles(
    mesh,
    new Map([
      [
        firstRecord.index,
        [orientTriangle(mesh, [firstOpposite, secondOpposite, firstVertexIndex], firstArea)],
      ],
      [
        secondRecord.index,
        [orientTriangle(mesh, [secondOpposite, firstOpposite, secondVertexIndex], secondArea)],
      ],
    ]),
  )

  return validateMesh(result).valid ? result : undefined
}

const validateEdgeOptions = (options: EditPartEdgeOptions, part: PuppetPart) =>
  hasValidVertexIndex(part.mesh, options.firstVertexIndex) &&
  hasValidVertexIndex(part.mesh, options.secondVertexIndex) &&
  options.firstVertexIndex !== options.secondVertexIndex

export const flipPartEdge = (options: EditPartEdgeOptions): EditDocumentResult => {
  const part = getPart(options.document, options.partId)

  if (part === undefined) {
    return {error: {code: 'missing-part'}, ok: false}
  }

  if (!validateMesh(part.mesh).valid) {
    return {error: {code: 'invalid-mesh'}, ok: false}
  }

  if (!validateEdgeOptions(options, part)) {
    return {error: {code: 'invalid-edge'}, ok: false}
  }

  const mesh = flipMeshEdge(part.mesh, options.firstVertexIndex, options.secondVertexIndex)

  return mesh === undefined
    ? {error: {code: 'invalid-edge'}, ok: false}
    : createPartResult(options.document, part, mesh)
}

const findCrossingEdge = (
  mesh: PuppetMesh,
  firstVertexIndex: number,
  secondVertexIndex: number,
): MeshEdge | undefined => {
  const first = getMeshVertex(mesh, firstVertexIndex)
  const second = getMeshVertex(mesh, secondVertexIndex)
  const visited = new Set<string>()

  if (first === undefined || second === undefined) {
    return undefined
  }

  for (const record of getMeshEdgeRecords(mesh)) {
    const {edge} = record
    const key = getEdgeKey(edge.firstIndex, edge.secondIndex)
    const sharesTarget =
      edge.firstIndex === firstVertexIndex ||
      edge.firstIndex === secondVertexIndex ||
      edge.secondIndex === firstVertexIndex ||
      edge.secondIndex === secondVertexIndex

    if (!visited.has(key) && !sharesTarget) {
      const edgeStart = getMeshVertex(mesh, edge.firstIndex)
      const edgeEnd = getMeshVertex(mesh, edge.secondIndex)

      if (
        edgeStart !== undefined &&
        edgeEnd !== undefined &&
        doSegmentsCross(first, second, edgeStart, edgeEnd)
      ) {
        return edge
      }
    }

    visited.add(key)
  }

  return undefined
}

export const connectPartVertices = (options: EditPartEdgeOptions): EditDocumentResult => {
  const part = getPart(options.document, options.partId)

  if (part === undefined) {
    return {error: {code: 'missing-part'}, ok: false}
  }

  if (!validateMesh(part.mesh).valid) {
    return {error: {code: 'invalid-mesh'}, ok: false}
  }

  if (!validateEdgeOptions(options, part)) {
    return {error: {code: 'invalid-edge'}, ok: false}
  }

  if (hasMeshEdge(part.mesh, options.firstVertexIndex, options.secondVertexIndex)) {
    return {error: {code: 'edge-exists'}, ok: false}
  }

  let {mesh} = part
  let flipCount = 0

  while (
    !hasMeshEdge(mesh, options.firstVertexIndex, options.secondVertexIndex) &&
    flipCount < MAXIMUM_EDGE_FLIPS
  ) {
    const crossingEdge = findCrossingEdge(mesh, options.firstVertexIndex, options.secondVertexIndex)
    const flippedMesh =
      crossingEdge === undefined
        ? undefined
        : flipMeshEdge(mesh, crossingEdge.firstIndex, crossingEdge.secondIndex)

    if (flippedMesh === undefined) {
      return {error: {code: 'edge-blocked'}, ok: false}
    }

    mesh = flippedMesh
    flipCount += 1
  }

  return hasMeshEdge(mesh, options.firstVertexIndex, options.secondVertexIndex)
    ? createPartResult(options.document, part, mesh)
    : {error: {code: 'edge-blocked'}, ok: false}
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

const updateMotionIndices = (document: PuppetDocument, partId: string, vertexIndex: number) =>
  document.motions.map((motion) => ({
    ...motion,
    tracks: motion.tracks
      .filter((track) => track.partId !== partId || track.vertexIndex !== vertexIndex)
      .map((track) =>
        track.partId === partId && track.vertexIndex > vertexIndex
          ? {...track, vertexIndex: track.vertexIndex - 1}
          : track,
      ),
  }))

export const collapsePartEdge = (options: EditPartEdgeOptions): EditDocumentResult => {
  const part = getPart(options.document, options.partId)

  if (part === undefined) {
    return {error: {code: 'missing-part'}, ok: false}
  }

  if (!validateMesh(part.mesh).valid) {
    return {error: {code: 'invalid-mesh'}, ok: false}
  }

  if (part.mesh.vertices.length / COORDINATES_PER_VERTEX <= MINIMUM_VERTEX_COUNT) {
    return {error: {code: 'minimum-vertex-count'}, ok: false}
  }

  if (
    !validateEdgeOptions(options, part) ||
    !hasMeshEdge(part.mesh, options.firstVertexIndex, options.secondVertexIndex)
  ) {
    return {error: {code: 'invalid-edge'}, ok: false}
  }

  const firstPoint = getMeshVertex(part.mesh, options.firstVertexIndex)
  const secondPoint = getMeshVertex(part.mesh, options.secondVertexIndex)

  if (firstPoint === undefined || secondPoint === undefined) {
    return {error: {code: 'invalid-edge'}, ok: false}
  }

  const movedResult = movePartVertex({
    document: options.document,
    partId: options.partId,
    vertexIndex: options.firstVertexIndex,
    x: (firstPoint.x + secondPoint.x) / 2,
    y: (firstPoint.y + secondPoint.y) / 2,
  })

  if (!movedResult.ok) {
    return movedResult
  }

  const movedPart = getPart(movedResult.document, options.partId)

  if (movedPart === undefined) {
    return {error: {code: 'missing-part'}, ok: false}
  }

  const remappedTriangles = getMeshTriangles(movedPart.mesh)
    .map(
      (triangle) =>
        triangle.map((index) =>
          index === options.secondVertexIndex ? options.firstVertexIndex : index,
        ) as unknown as MeshTriangleIndices,
    )
    .filter((triangle) => new Set(triangle).size === INDICES_PER_TRIANGLE)
  const uniqueTriangles = new Map<string, MeshTriangleIndices>()

  for (const triangle of remappedTriangles) {
    const key = [...triangle].sort((firstIndex, secondIndex) => firstIndex - secondIndex).join(':')
    uniqueTriangles.set(key, triangle)
  }

  const mesh = removeVertexData(
    movedPart.mesh,
    options.secondVertexIndex,
    [...uniqueTriangles.values()].flatMap((triangle) => triangle),
  )
  const result = createPartResult(movedResult.document, movedPart, mesh)

  return result.ok
    ? {
        ...result,
        document: {
          ...result.document,
          motions: updateMotionIndices(
            movedResult.document,
            movedPart.id,
            options.secondVertexIndex,
          ),
        },
      }
    : result
}
