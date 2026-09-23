import type {PuppetDeformerShape, PuppetPoint, PuppetVertexReference} from '../player/document'
import {getBoneWeights} from './bone'

export const getVertexInfluence = (
  node: PuppetDeformerShape,
  vertex?: PuppetVertexReference,
): number =>
  node.vertexInfluences?.find(
    (entry) => entry.partId === vertex?.partId && entry.vertexIndex === vertex?.vertexIndex,
  )?.weight ?? 1

export const getDeformerWeights = (
  node: PuppetDeformerShape,
  point: PuppetPoint,
  vertex: PuppetVertexReference,
): readonly number[] =>
  node.boneRestPoints === undefined
    ? [getVertexInfluence(node, vertex)]
    : getBoneWeights(node, point, vertex)
