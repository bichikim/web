import type {
  PuppetDeformerShape,
  PuppetPoint,
  PuppetVertexInfluence,
  PuppetVertexReference,
} from '../player/document'
import {getBoneWeights} from './bone'

const influenceIndexByList = new WeakMap<
  ReadonlyArray<PuppetVertexInfluence>,
  ReadonlyMap<string, ReadonlyMap<number, number>>
>()

const getInfluenceIndex = (influences: ReadonlyArray<PuppetVertexInfluence>) => {
  const cached = influenceIndexByList.get(influences)
  if (cached !== undefined) {
    return cached
  }

  const index = new Map<string, Map<number, number>>()
  for (const influence of influences) {
    const part = index.get(influence.partId) ?? new Map<number, number>()
    if (!part.has(influence.vertexIndex)) {
      part.set(influence.vertexIndex, influence.weight)
    }
    index.set(influence.partId, part)
  }
  influenceIndexByList.set(influences, index)
  return index
}

export const getVertexInfluence = (
  node: PuppetDeformerShape,
  vertex?: PuppetVertexReference,
): number => {
  const influences = node.vertexInfluences
  return influences === undefined || vertex === undefined
    ? 1
    : (getInfluenceIndex(influences).get(vertex.partId)?.get(vertex.vertexIndex) ?? 1)
}

export const getDeformerWeights = (
  node: PuppetDeformerShape,
  point: PuppetPoint,
  vertex: PuppetVertexReference,
): readonly number[] =>
  node.boneRestPoints === undefined
    ? [getVertexInfluence(node, vertex)]
    : getBoneWeights(node, point, vertex)
