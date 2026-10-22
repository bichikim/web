import {getBoundaryEdges} from '../../mesh/boundary'
import type {
  PuppetEdgeReference,
  PuppetGlue,
  PuppetParameterBinding,
  PuppetPart,
  PuppetVertexReference,
} from '../document'
import {isFiniteNumber, isRecord} from './parse-primitives'

const isRatio = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 1
const isGlueKeyform = (value: unknown, unbounded: boolean): boolean =>
  isRecord(value) &&
  typeof value.id === 'string' &&
  value.id.length > 0 &&
  isRatio(value.weight) &&
  (unbounded ? isFiniteNumber(value.strength) : isRatio(value.strength))

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

const hasMeshVertex = (reference: PuppetVertexReference, parts: ReadonlyArray<PuppetPart>) => {
  const part = parts.find((candidate) => candidate.id === reference.partId)
  return part !== undefined && reference.vertexIndex * 2 + 1 < part.mesh.vertices.length
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
      !hasMeshVertex(connection.first, parts) ||
      !hasMeshVertex(connection.second, parts)
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

const hasDirectGlue = (
  binding: PuppetParameterBinding,
  owners: ReadonlyMap<string, PuppetGlue>,
): boolean => {
  const targets = binding.targetGlueIds === undefined ? undefined : new Set(binding.targetGlueIds)
  return (
    (binding.targetGlueIds ?? []).every((id) => owners.has(id)) &&
    binding.keyforms.every((form) => {
      const samples = form.glue ?? []
      const legacy = new Set(
        form.parts.flatMap((part) => part.glue?.map((sample) => sample.id) ?? []),
      )
      return (
        (targets === undefined ||
          (samples.length === targets.size && samples.every((sample) => targets.has(sample.id)))) &&
        samples.every((sample) => {
          const connection = owners.get(sample.id)
          return (
            connection !== undefined &&
            !legacy.has(sample.id) &&
            (!('edge' in connection.second) || sample.weight === 1)
          )
        })
      )
    })
  )
}

export const hasValidGlueKeyforms = (
  glue: unknown,
  bindings: ReadonlyArray<PuppetParameterBinding>,
  parts: ReadonlyArray<PuppetPart>,
): boolean => {
  if (!hasValidGlue(glue, parts)) {
    return false
  }
  const owners = new Map((glue ?? []).map((connection) => [connection.id, connection]))
  const directValid = bindings.every((binding) => hasDirectGlue(binding, owners))
  const samples = bindings.flatMap((binding) => binding.keyforms.flatMap((form) => form.parts))
  return (
    directValid &&
    samples.every((part) =>
      (part.glue ?? []).every((sample) => {
        const connection = owners.get(sample.id)
        return (
          connection !== undefined &&
          connection.first.partId === part.partId &&
          (!('edge' in connection.second) || sample.weight === 1)
        )
      }),
    )
  )
}

export const isGlueKeyforms = (value: unknown, unbounded = false): boolean =>
  value === undefined ||
  (Array.isArray(value) &&
    value.every((form) => isGlueKeyform(form, unbounded)) &&
    new Set(value.map((sample) => sample.id)).size === value.length)
