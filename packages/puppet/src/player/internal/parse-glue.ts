import {getBoundaryEdges} from '../../mesh/boundary'
import type {PuppetEdgeReference, PuppetGlue, PuppetPart, PuppetVertexReference} from '../document'

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null
const isRatio = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 1
const isReference = (value: unknown): value is PuppetVertexReference =>
  isRecord(value) &&
  typeof value.partId === 'string' &&
  typeof value.vertexIndex === 'number' &&
  Number.isInteger(value.vertexIndex) &&
  value.vertexIndex >= 0

export const isBoundaryReference = (
  reference: PuppetVertexReference,
  parts: ReadonlyArray<PuppetPart>,
): boolean => {
  const part = parts.find((candidate) => candidate.id === reference.partId)
  return (
    part !== undefined &&
    getBoundaryEdges(part.mesh).some(
      (edge) =>
        edge.firstIndex === reference.vertexIndex || edge.secondIndex === reference.vertexIndex,
    )
  )
}

const isEdgeReference = (
  value: PuppetVertexReference,
  parts: ReadonlyArray<PuppetPart>,
): value is PuppetEdgeReference => {
  if (!('edge' in value) || !isRecord(value.edge) || !isRatio(value.edge.position)) {
    return false
  }
  const {edge} = value
  const part = parts.find((part) => part.id === value.partId)
  return (
    part !== undefined &&
    getBoundaryEdges(part.mesh).some(
      (candidate) =>
        (candidate.firstIndex === value.vertexIndex && candidate.secondIndex === edge.endIndex) ||
        (candidate.secondIndex === value.vertexIndex && candidate.firstIndex === edge.endIndex),
    )
  )
}

const validTarget = (
  reference: PuppetVertexReference,
  weight: unknown,
  parts: ReadonlyArray<PuppetPart>,
) => !('edge' in reference) || (isEdgeReference(reference, parts) && weight === 1)

export const hasValidGlue = (
  value: unknown,
  parts: ReadonlyArray<PuppetPart>,
): value is ReadonlyArray<PuppetGlue> | undefined => {
  if (value === undefined) {
    return true
  }
  if (!Array.isArray(value)) {
    return false
  }
  const ids = new Set<string>()
  const references = new Set<string>()
  const targets = new Set<string>()
  return value.every((connection: unknown) => {
    if (
      !isRecord(connection) ||
      typeof connection.id !== 'string' ||
      connection.id.length === 0 ||
      ids.has(connection.id) ||
      !isReference(connection.first) ||
      !isReference(connection.second) ||
      'edge' in connection.first ||
      !validTarget(connection.second, connection.weight, parts) ||
      connection.first.partId === connection.second.partId ||
      !isRatio(connection.weight) ||
      !isRatio(connection.strength)
    ) {
      return false
    }
    const edge = 'edge' in connection.second ? connection.second.edge : undefined
    const sources = edge === undefined ? [connection.first, connection.second] : [connection.first]
    const keys = sources.map((reference) =>
      JSON.stringify([reference.partId, reference.vertexIndex]),
    )
    if (
      keys.some((key) => references.has(key) || targets.has(key)) ||
      !isBoundaryReference(connection.first, parts) ||
      !isBoundaryReference(connection.second, parts)
    ) {
      return false
    }
    if (isEdgeReference(connection.second, parts)) {
      const target = connection.second
      const targetKeys = [target.vertexIndex, target.edge.endIndex].map((index) =>
        JSON.stringify([target.partId, index]),
      )
      if (targetKeys.some((key) => references.has(key))) {
        return false
      }
      targetKeys.forEach((key) => targets.add(key))
    }
    ids.add(connection.id)
    keys.forEach((key) => references.add(key))
    return true
  })
}
