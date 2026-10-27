import {blendSkinMatrix, getSkinFrames, type SkinFrame, transformSkinPoint} from './skinning'
import type {
  PuppetPoint,
  PuppetSceneContainerNode,
  PuppetSceneDeformerNode,
  PuppetSceneNode,
  PuppetVertexReference,
} from '../player/document'
import {transformDeformerPoint} from './grid'
import {createDeferredParentSpaceTransform, createParentSpaceTransform} from './parent-space'
import {sameDeformerShape} from './binding'

type PointTransform = (point: PuppetPoint, vertex?: PuppetVertexReference) => PuppetPoint
const identityPoint: PointTransform = (point) => point

const COORDINATES_PER_POINT = 2

interface DeformationContext {
  readonly deferCoordinates: boolean
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

interface NodeTransform {
  readonly deferCoordinates: boolean
  readonly parent: PointTransform
  readonly parentRotation: boolean
  readonly vertexDependent: boolean
  readonly shape: PuppetSceneDeformerNode
  readonly transform: PointTransform
}

// A static branch keeps its compiled parent-space grid across animation frames. Only its
// latest parent transform is retained; edited or newly sampled shapes have different keys.
const nodeTransforms = new WeakMap<ReadonlyArray<number>, NodeTransform>()

const getNodeTransform = (
  node: PuppetSceneContainerNode,
  parent: PointTransform,
  context: DeformationContext,
): PointTransform => {
  if (node.kind === 'group') {
    return parent
  }
  const {parentDeformer, vertexDependent} = context
  const parentRotation = parentDeformer?.deformerType === 'rotation'
  const previous = nodeTransforms.get(node.controlPoints)
  if (
    previous?.parent === parent &&
    previous.deferCoordinates === context.deferCoordinates &&
    previous.parentRotation === parentRotation &&
    previous.vertexDependent === vertexDependent &&
    previous.shape.binding === node.binding &&
    previous.shape.coordinateSpace === node.coordinateSpace &&
    sameDeformerShape(previous.shape, node)
  ) {
    return previous.transform
  }
  // Local transforms do not own the composed child tree or its animation frames.
  const shape = {...node, children: []}
  const parentShape = parentDeformer === undefined ? undefined : {...parentDeformer, children: []}
  const createTransform = context.deferCoordinates
    ? createDeferredParentSpaceTransform
    : createParentSpaceTransform
  const transform =
    shape.coordinateSpace === 'parent'
      ? vertexDependent
        ? (point: PuppetPoint, vertex?: PuppetVertexReference) =>
            createTransform(shape, (position) => parent(position, vertex), parentShape)(point)
        : createTransform(shape, parent, parentShape)
      : composeTransform(parent, createNodeTransform(shape))
  nodeTransforms.set(node.controlPoints, {
    deferCoordinates: context.deferCoordinates,
    parent,
    parentRotation,
    shape,
    transform,
    vertexDependent,
  })
  return transform
}

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
      const transform = getNodeTransform(node, parentTransform, context)
      applyNodes(node.children, transform, verticesByPartId, {
        deferCoordinates: context.deferCoordinates,
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

export interface ApplySceneNodeDeformersOptions {
  /** Resolve world-space grid points on demand; omitted, eagerly snapshot the parent mapping. */
  readonly deferCoordinates?: boolean
}

export const applySceneNodeDeformers = (
  nodes: ReadonlyArray<PuppetSceneNode>,
  verticesByPartId: ReadonlyMap<string, Float32Array | number[]>,
  options: ApplySceneNodeDeformersOptions = {},
) => {
  applyNodes(nodes, identityPoint, verticesByPartId, {
    deferCoordinates: options.deferCoordinates ?? false,
    frames: getSkinFrames(nodes),
    vertexDependent: false,
  })
}
