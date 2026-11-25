import {composeParameterVertices} from '../../deformation/composition'
import {composeRenderScene} from '../../deformation/compose-render-scene'
import {applySceneNodeDeformers} from '../../deformation/vertices'
import {applyGlue} from '../../deformation/glue'
import {composeParameterGlue} from '../../deformation/parameter-glue'
import type {PuppetDocument, PuppetPoint, PuppetSceneNode} from '../document'
import {getDocumentScene} from '../scene'
import {createNativeDeformation} from './create-native-deformation'
import {meshPoint} from './mesh-point'
import type {ParameterPose} from './solve-parameter-pose'

interface CreatePartPoseSamplerOptions {
  readonly document: PuppetDocument
  readonly partId: string
  readonly point: PuppetPoint
  readonly vertices: ArrayLike<number>
}

const branchForParts = (
  nodes: readonly PuppetSceneNode[],
  partIds: ReadonlySet<string>,
): readonly PuppetSceneNode[] =>
  nodes.flatMap((node): readonly PuppetSceneNode[] => {
    if (node.kind === 'part') {
      return partIds.has(node.id) ? [node] : []
    }
    const children = branchForParts(node.children, partIds)
    return children.length === 0 && !partIds.has(node.id) ? [] : [{...node, children}]
  })

const connectedParts = (document: PuppetDocument, partId: string): ReadonlySet<string> => {
  const ids = new Set([partId])
  const visit = (id: string) => {
    for (const connection of document.glue ?? []) {
      if (connection.first.partId === id || connection.second.partId === id) {
        for (const peer of [connection.first.partId, connection.second.partId]) {
          if (!ids.has(peer)) {
            ids.add(peer)
            visit(peer)
          }
        }
      }
    }
  }
  visit(partId)
  return ids
}

/** Skinning may attach the grabbed mesh to bones in a separate scene branch. */
const skinTargets = (
  nodes: readonly PuppetSceneNode[],
  ids: ReadonlySet<string>,
): ReadonlySet<string> => {
  const targets = new Set(ids)
  const visit = (node: PuppetSceneNode) => {
    if (node.kind === 'part') {
      if (ids.has(node.id)) {
        node.skinning?.influences.forEach((influence) => targets.add(influence.nodeId))
      }
    } else {
      node.children.forEach(visit)
    }
  }
  nodes.forEach(visit)
  return targets
}

/** Evaluates just the grabbed branch on the CPU; solving never redraws the GPU scene. */
export const createPartPoseSampler = (options: CreatePartPoseSamplerOptions) => {
  const part = options.document.parts.find((item) => item.id === options.partId)
  if (part === undefined || part.spatial !== undefined) {
    return undefined
  }
  const anchor = meshPoint({
    indices: part.mesh.indices,
    point: options.point,
    vertices: options.vertices,
  })
  const ids = connectedParts(options.document, part.id)
  const source = getDocumentScene(options.document).roots
  const roots = branchForParts(source, skinTargets(source, ids))
  if (anchor === undefined) {
    return undefined
  }
  const document = {
    ...options.document,
    glue: options.document.glue?.filter(
      (connection) => ids.has(connection.first.partId) && ids.has(connection.second.partId),
    ),
    scene: {roots},
  }
  const native = createNativeDeformation(document)
  const parts = document.parts.filter((item) => ids.has(item.id))
  return (values: Readonly<Record<string, number>>): ParameterPose => {
    const byId = new Map(
      parts.map((item) => [
        item.id,
        [
          ...composeParameterVertices({
            document,
            parameterValues: values,
            partId: item.id,
            restVertices: item.mesh.vertices,
          }),
        ],
      ]),
    )
    if (native === undefined) {
      applySceneNodeDeformers(composeRenderScene(document, values).roots, byId, {
        deferCoordinates: true,
      })
    } else {
      native.apply(values, byId)
    }
    applyGlue(composeParameterGlue({document, parameterValues: values}), byId)
    const vertices = byId.get(part.id)!
    const {indices} = anchor
    const x = indices.reduce(
      (sum, index, position) => sum + vertices[index * 2]! * anchor.weights[position]!,
      0,
    )
    const y = indices.reduce(
      (sum, index, position) => sum + vertices[index * 2 + 1]! * anchor.weights[position]!,
      0,
    )
    const first = indices[0]! * 2
    const second = indices[1]! * 2
    return {
      angle: Math.atan2(
        vertices[second + 1]! - vertices[first + 1]!,
        vertices[second]! - vertices[first]!,
      ),
      x,
      y,
    }
  }
}
