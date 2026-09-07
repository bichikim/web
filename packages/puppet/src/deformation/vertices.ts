import type {
  PuppetPoint,
  PuppetSceneContainerNode,
  PuppetSceneNode,
  PuppetVertexReference,
} from '../player/document'
import {transformDeformerPoint} from './grid'

type PointTransform = (point: PuppetPoint, vertex: PuppetVertexReference) => PuppetPoint

const COORDINATES_PER_POINT = 2

const createNodeTransform = (node: PuppetSceneContainerNode): PointTransform => {
  switch (node.kind) {
    case 'deformer':
      return (point, vertex) => transformDeformerPoint(node, point, vertex)
    case 'group':
      return (point) => point
    default: {
      const exhaustiveNode: never = node
      return exhaustiveNode
    }
  }
}

const composeTransform =
  (parent: PointTransform, child: PointTransform): PointTransform =>
  (point, vertex) =>
    parent(child(point, vertex), vertex)

const applyTransform = (
  partId: string,
  vertices: Float32Array | number[],
  transform: PointTransform,
) => {
  for (let index = 0; index < vertices.length; index += COORDINATES_PER_POINT) {
    const point = transform(
      {x: vertices[index] ?? 0, y: vertices[index + 1] ?? 0},
      {partId, vertexIndex: index / COORDINATES_PER_POINT},
    )
    vertices[index] = point.x
    vertices[index + 1] = point.y
  }
}

const applyNodes = (
  nodes: ReadonlyArray<PuppetSceneNode>,
  parentTransform: PointTransform,
  verticesByPartId: ReadonlyMap<string, Float32Array | number[]>,
) => {
  for (const node of nodes) {
    if (node.kind === 'part') {
      const vertices = verticesByPartId.get(node.id)

      if (vertices !== undefined) {
        applyTransform(node.id, vertices, parentTransform)
      }
    } else {
      applyNodes(
        node.children,
        composeTransform(parentTransform, createNodeTransform(node)),
        verticesByPartId,
      )
    }
  }
}

export const applySceneNodeDeformers = (
  nodes: ReadonlyArray<PuppetSceneNode>,
  verticesByPartId: ReadonlyMap<string, Float32Array | number[]>,
) => {
  applyNodes(nodes, (point) => point, verticesByPartId)
}
