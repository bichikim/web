import {getBoundaryEdges} from '../../mesh/boundary'
import type {PuppetDocument, PuppetEdgeReference} from '../../player'
import {hasValidGlue} from '../../player/internal/parse-glue'
import {canGlueVertex} from './glue'
import {isSceneNodeLocked} from './scene-graph'
import {applySceneDeformers} from './scene-deformation'

interface EdgeMatch {
  readonly distance: number
  readonly reference: PuppetEdgeReference
}

const findEdge = (
  point: ReadonlyArray<number>,
  vertices: ReadonlyArray<number>,
  part: PuppetDocument['parts'][number],
): EdgeMatch | undefined => {
  let nearest: EdgeMatch | undefined
  for (const edge of getBoundaryEdges(part.mesh)) {
    const start = edge.firstIndex * 2
    const end = edge.secondIndex * 2
    const dx = vertices[end]! - vertices[start]!
    const dy = vertices[end + 1]! - vertices[start + 1]!
    const length = dx * dx + dy * dy
    if (length > 0) {
      const position = Math.max(
        0,
        Math.min(
          1,
          ((point[0]! - vertices[start]!) * dx + (point[1]! - vertices[start + 1]!) * dy) / length,
        ),
      )
      const distance = Math.hypot(
        point[0]! - vertices[start]! - dx * position,
        point[1]! - vertices[start + 1]! - dy * position,
      )
      if (nearest === undefined || distance < nearest.distance) {
        nearest = {
          distance,
          reference: {
            edge: {endIndex: edge.secondIndex, position},
            partId: part.id,
            vertexIndex: edge.firstIndex,
          },
        }
      }
    }
  }
  return nearest
}

/** Binds available source boundary vertices to nearby target edges in the document pose. */
export const addBoundaryGlue = (
  document: PuppetDocument,
  sourceId: string,
  targetId: string,
  distance?: number,
): PuppetDocument | undefined => {
  const source = document.parts.find((part) => part.id === sourceId)
  const target = document.parts.find((part) => part.id === targetId)
  if (
    source === undefined ||
    target === undefined ||
    sourceId === targetId ||
    (distance !== undefined && (!Number.isFinite(distance) || distance < 0)) ||
    isSceneNodeLocked(document, targetId)
  ) {
    return undefined
  }
  const vertices = new Map(document.parts.map((part) => [part.id, [...part.mesh.vertices]]))
  applySceneDeformers({document: {...document, glue: []}, verticesByPartId: vertices})
  const sourcePoints = vertices.get(sourceId)!
  const targetPoints = vertices.get(targetId)!
  const indices = new Set(
    getBoundaryEdges(source.mesh).flatMap((edge) => [edge.firstIndex, edge.secondIndex]),
  )
  const matches = [...indices].map((vertexIndex) => ({
    match: findEdge(sourcePoints.slice(vertexIndex * 2, vertexIndex * 2 + 2), targetPoints, target),
    vertexIndex,
  }))
  const TOLERANCE = 0.000001
  const limit =
    distance ?? Math.min(...matches.map(({match}) => match?.distance ?? Infinity)) + TOLERANCE
  const glue = [...(document.glue ?? [])]
  const ids = new Set(glue.map((connection) => connection.id))
  let suffix = 1
  for (const {vertexIndex, match} of matches) {
    const first = {partId: sourceId, vertexIndex}
    if (canGlueVertex(document, first) && match !== undefined && match.distance <= limit) {
      while (ids.has(`glue-${suffix}`)) {
        suffix += 1
      }
      const connection = {
        first,
        id: `glue-${suffix}`,
        second: match.reference,
        strength: 1,
        weight: 1,
      }
      if (hasValidGlue([...glue, connection], document.parts)) {
        glue.push(connection)
        ids.add(connection.id)
      }
    }
  }
  return glue.length === (document.glue?.length ?? 0) ? undefined : {...document, glue}
}
