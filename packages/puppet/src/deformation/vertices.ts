import {blendSkinMatrix, getSkinFrames, type SkinFrame, transformSkinPoint} from './skinning'
import type {
  PuppetPoint,
  PuppetSceneContainerNode,
  PuppetSceneDeformerNode,
  PuppetSceneNode,
  PuppetVertexReference,
} from '../player/document'
import {transformDeformerPoint} from './grid'
import {createParentSpaceTransform} from './parent-space'

type PointTransform = (point: PuppetPoint, vertex?: PuppetVertexReference) => PuppetPoint

const COORDINATES_PER_POINT = 2

interface DeformationContext {
  readonly parentDeformer?: PuppetSceneDeformerNode
  readonly frames: ReadonlyMap<string, SkinFrame>
  readonly vertexDependent: boolean
}

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
  transform: (point: PuppetPoint, vertex: PuppetVertexReference) => PuppetPoint,
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
  context: DeformationContext,
) => {
  const {frames, vertexDependent} = context
  for (const node of nodes) {
    if (node.kind === 'part') {
      const vertices = verticesByPartId.get(node.id)

      if (vertices !== undefined) {
        const {skinning} = node
        applyTransform(
          node.id,
          vertices,
          skinning === undefined
            ? parentTransform
            : (point, vertex) => {
                const matrix = blendSkinMatrix(frames, skinning, vertex.vertexIndex)
                return matrix === undefined
                  ? parentTransform(point, vertex)
                  : transformSkinPoint(matrix, point)
              },
        )
      }
    } else {
      const transform =
        node.kind === 'deformer' && node.coordinateSpace === 'parent'
          ? vertexDependent
            ? (point: PuppetPoint, vertex?: PuppetVertexReference) =>
                createParentSpaceTransform(
                  node,
                  (position) => parentTransform(position, vertex),
                  context.parentDeformer,
                )(point)
            : createParentSpaceTransform(node, parentTransform, context.parentDeformer)
          : composeTransform(parentTransform, createNodeTransform(node))
      applyNodes(node.children, transform, verticesByPartId, {
        frames,
        parentDeformer: node.kind === 'deformer' ? node : context.parentDeformer,
        vertexDependent:
          vertexDependent ||
          (node.kind === 'deformer' &&
            (node.boneWeights !== undefined || node.vertexInfluences !== undefined)),
      })
    }
  }
}

export const applySceneNodeDeformers = (
  nodes: ReadonlyArray<PuppetSceneNode>,
  verticesByPartId: ReadonlyMap<string, Float32Array | number[]>,
) => {
  applyNodes(nodes, (point) => point, verticesByPartId, {
    frames: getSkinFrames(nodes),
    vertexDependent: false,
  })
}
