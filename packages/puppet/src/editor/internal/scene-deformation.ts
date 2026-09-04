import {
  applySceneNodeDeformers,
  transformDeformerPoint,
  untransformDeformerPoint,
} from '../../deformation'
import {
  getDocumentScene,
  type PuppetDocument,
  type PuppetPoint,
  type PuppetSceneContainerNode,
  type PuppetSceneNode,
} from '../../player'

export interface ApplySceneDeformersOptions {
  readonly document: PuppetDocument
  readonly verticesByPartId: ReadonlyMap<string, Float32Array | number[]>
}

export interface UnapplySceneDeformersPointOptions {
  readonly document: PuppetDocument
  readonly partId: string
  readonly point: PuppetPoint
}

export interface TransformSceneNodePointOptions {
  readonly document: PuppetDocument
  readonly nodeId: string
  readonly point: PuppetPoint
}

type PointTransform = (point: PuppetPoint) => PuppetPoint

const createNodeTransform = (node: PuppetSceneContainerNode): PointTransform => {
  switch (node.kind) {
    case 'deformer':
      return (point) => transformDeformerPoint(node, point)
    case 'group':
      return (point) => point
    default: {
      const exhaustiveNode: never = node
      return exhaustiveNode
    }
  }
}

const createInverseNodeTransform = (node: PuppetSceneContainerNode): PointTransform => {
  switch (node.kind) {
    case 'deformer':
      return (point) => untransformDeformerPoint(node, point)
    case 'group':
      return (point) => point
    default: {
      const exhaustiveNode: never = node
      return exhaustiveNode
    }
  }
}

const findNodeAncestorPath = (
  nodes: ReadonlyArray<PuppetSceneNode>,
  nodeId: string,
  path: ReadonlyArray<PuppetSceneContainerNode> = [],
): ReadonlyArray<PuppetSceneContainerNode> | undefined => {
  for (const node of nodes) {
    if (node.id === nodeId) {
      return path
    }

    if (node.kind !== 'part') {
      const result = findNodeAncestorPath(node.children, nodeId, [...path, node])

      if (result !== undefined) {
        return result
      }
    }
  }

  return undefined
}

export const applySceneDeformers = (options: ApplySceneDeformersOptions) => {
  applySceneNodeDeformers(getDocumentScene(options.document).roots, options.verticesByPartId)
}

export const unapplySceneDeformersPoint = (
  options: UnapplySceneDeformersPointOptions,
): PuppetPoint => {
  const path = findNodeAncestorPath(getDocumentScene(options.document).roots, options.partId) ?? []
  return path.reduce((point, node) => createInverseNodeTransform(node)(point), options.point)
}

export const applySceneNodeAncestorsPoint = (
  options: TransformSceneNodePointOptions,
): PuppetPoint => {
  const path = findNodeAncestorPath(getDocumentScene(options.document).roots, options.nodeId) ?? []
  return path.reduceRight((point, node) => createNodeTransform(node)(point), options.point)
}

export const unapplySceneNodeAncestorsPoint = (
  options: TransformSceneNodePointOptions,
): PuppetPoint => {
  const path = findNodeAncestorPath(getDocumentScene(options.document).roots, options.nodeId) ?? []
  return path.reduce((point, node) => createInverseNodeTransform(node)(point), options.point)
}
