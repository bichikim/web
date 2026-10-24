import {getDeformerWeights} from '../../deformation/weights'
import {getDeformerInputPoint} from '../../deformation/grid'
import {applySceneNodeDeformers} from '../../deformation/vertices'
import {
  getDocumentScene,
  type PuppetDeformerShape,
  type PuppetDocument,
  type PuppetSceneDeformerNode,
  type PuppetSceneNode,
  type PuppetVertexReference,
} from '../../player'
import {collectPartIds, findNode, findNodeLock, updateNode} from './scene-tree'

export interface SetDeformerVertexWeightOptions extends PuppetVertexReference {
  readonly document: PuppetDocument
  readonly nodeId: string
  readonly boneIndex: number
  readonly weight?: number
}

export const getDeformerParts = (document: PuppetDocument, node: PuppetSceneDeformerNode) => {
  const ids = new Set<string>()
  collectPartIds(node, ids)
  return document.parts.filter((part) => ids.has(part.id))
}

export const getDeformerInputVertices = (
  document: PuppetDocument,
  node: PuppetSceneDeformerNode,
) => {
  const vertices = new Map(
    getDeformerParts(document, node).map((part) => [part.id, [...part.mesh.vertices]]),
  )
  applySceneNodeDeformers(node.children, vertices)
  for (const [partId, coordinates] of vertices) {
    for (let index = 0; index < coordinates.length; index += 2) {
      const point = getDeformerInputPoint(
        node,
        {x: coordinates[index]!, y: coordinates[index + 1]!},
        {partId, vertexIndex: index / 2},
      )
      coordinates[index] = point.x
      coordinates[index + 1] = point.y
    }
  }
  return vertices
}

export interface DeformerWeightChange extends PuppetVertexReference {
  readonly boneIndex: number
  readonly weight?: number
}
export interface SetDeformerVertexWeightsOptions {
  readonly document: PuppetDocument
  readonly nodeId: string
  readonly changes: readonly DeformerWeightChange[]
}
const vertexKey = (vertex: PuppetVertexReference) =>
  JSON.stringify([vertex.partId, vertex.vertexIndex])

const isValidWeightChange = (
  change: DeformerWeightChange,
  coordinateCount: number | undefined,
  count: number,
): boolean =>
  coordinateCount !== undefined &&
  Number.isInteger(change.vertexIndex) &&
  change.vertexIndex >= 0 &&
  change.vertexIndex < coordinateCount / 2 &&
  Number.isInteger(change.boneIndex) &&
  change.boneIndex >= 0 &&
  change.boneIndex < count &&
  (change.weight === undefined ||
    (Number.isFinite(change.weight) && change.weight >= 0 && change.weight <= 1))

export const setDeformerVertexWeights = (
  options: SetDeformerVertexWeightsOptions,
): PuppetDocument | undefined => {
  const scene = getDocumentScene(options.document)
  const node = findNode(scene.roots, options.nodeId)
  if (
    node?.kind !== 'deformer' ||
    findNodeLock(scene.roots, node.id) ||
    options.changes.length === 0
  ) {
    return undefined
  }
  const inputs = getDeformerInputVertices(options.document, node)
  const count = node.boneRestPoints === undefined ? 1 : node.boneRestPoints.length / 2 - 1
  const entries = new Map(
    (node.boneRestPoints === undefined
      ? (node.vertexInfluences ?? []).map((entry) => ({
          partId: entry.partId,
          vertexIndex: entry.vertexIndex,
          weights: [entry.weight],
        }))
      : (node.boneWeights ?? [])
    ).map((entry) => [vertexKey(entry), entry]),
  )
  for (const change of options.changes) {
    const coordinates = inputs.get(change.partId)
    if (
      !isValidWeightChange(change, coordinates?.length, count) ||
      findNodeLock(scene.roots, change.partId)
    ) {
      return undefined
    }
    const key = vertexKey(change)
    if (change.weight === undefined) {
      entries.delete(key)
    } else {
      const current =
        entries.get(key)?.weights ??
        getDeformerWeights(
          node,
          {x: coordinates![change.vertexIndex * 2]!, y: coordinates![change.vertexIndex * 2 + 1]!},
          change,
        )
      const remaining = current.reduce(
        (sum, value, index) => sum + (index === change.boneIndex ? 0 : value),
        0,
      )
      const {weight} = change
      const weights = current.map((value, index) =>
        index === change.boneIndex
          ? weight
          : remaining > 0
            ? (value / remaining) * (1 - weight)
            : (1 - weight) / (count - 1),
      )
      entries.set(key, {partId: change.partId, vertexIndex: change.vertexIndex, weights})
    }
  }
  const values = [...entries.values()]
  const weights =
    node.boneRestPoints === undefined
      ? {
          vertexInfluences: values.map((entry) => ({
            partId: entry.partId,
            vertexIndex: entry.vertexIndex,
            weight: entry.weights[0]!,
          })),
        }
      : {boneWeights: values}
  return {
    ...options.document,
    scene: {
      ...scene,
      roots: updateNode(scene.roots, node.id, () => ({
        ...node,
        binding:
          node.binding === undefined
            ? undefined
            : {...node.binding, rest: {...node.binding.rest, ...weights}},
        ...weights,
      })),
    },
  }
}

export const setDeformerVertexWeight = (
  options: SetDeformerVertexWeightOptions,
): PuppetDocument | undefined => setDeformerVertexWeights({...options, changes: [options]})

export const clearPartDeformerWeights = (
  document: PuppetDocument,
  partId: string,
): PuppetDocument => {
  const clear = (shape: PuppetDeformerShape): PuppetDeformerShape => ({
    ...shape,
    boneWeights: shape.boneWeights?.filter((entry) => entry.partId !== partId),
    vertexInfluences: shape.vertexInfluences?.filter((entry) => entry.partId !== partId),
  })
  const visit = (nodes: readonly PuppetSceneNode[]): readonly PuppetSceneNode[] =>
    nodes.map((node) => {
      if (node.kind === 'part') {
        return node
      }
      const children = visit(node.children)
      if (node.kind === 'group') {
        return {...node, children}
      }
      return {
        ...node,
        ...clear(node),
        binding:
          node.binding === undefined
            ? undefined
            : {
                rest: clear(node.binding.rest),
                steps: node.binding.steps.map((step) => ({
                  rest: step.rest === undefined ? undefined : clear(step.rest),
                  shape: clear(step.shape),
                })),
              },
        children,
      }
    })
  return document.scene === undefined
    ? document
    : {...document, scene: {...document.scene, roots: visit(document.scene.roots)}}
}
