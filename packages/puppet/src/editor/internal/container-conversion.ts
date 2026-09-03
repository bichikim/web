import {isTwoDimensionalParameterBinding} from '../../deformation'
import {
  createDeformerControlPoints,
  getDocumentScene,
  type PuppetDocument,
  type PuppetParameterBinding,
  type PuppetParameterKeyform,
  type PuppetSceneDeformerNode,
  type PuppetSceneGroupNode,
  type PuppetSceneNode,
} from '../../player'
import {getDeformerBounds} from './deformer-bounds'
import {isSceneNodeLocked} from './scene-graph'
import {collectPartIds, findNode, updateNode} from './scene-tree'

export type SceneContainerConversionTarget = 'deformer' | 'group'

export interface SceneContainerConversion {
  readonly nodeIds: ReadonlyArray<string>
  readonly targetKind: SceneContainerConversionTarget
}

export interface ConvertSceneContainersOptions extends SceneContainerConversion {
  readonly document: PuppetDocument
}

const removeDeformerTargets = (
  document: PuppetDocument,
  nodeIds: ReadonlySet<string>,
): PuppetDocument => {
  if (document.parameterBindings === undefined) {
    return document
  }

  const removeKeyformTargets = <Keyform extends PuppetParameterKeyform>(
    keyform: Keyform,
  ): Keyform =>
    ({
      ...keyform,
      deformers: keyform.deformers?.filter((deformer) => !nodeIds.has(deformer.nodeId)),
    }) as Keyform

  return {
    ...document,
    parameterBindings: document.parameterBindings.map((binding): PuppetParameterBinding => {
      const targetDeformerIds = binding.targetDeformerIds?.filter((id) => !nodeIds.has(id))

      return isTwoDimensionalParameterBinding(binding)
        ? {...binding, keyforms: binding.keyforms.map(removeKeyformTargets), targetDeformerIds}
        : {...binding, keyforms: binding.keyforms.map(removeKeyformTargets), targetDeformerIds}
    }),
  }
}

const createConvertedDeformer = (
  document: PuppetDocument,
  node: PuppetSceneGroupNode,
): PuppetSceneDeformerNode => {
  const partIds = new Set<string>()
  collectPartIds(node, partIds)
  const bounds = getDeformerBounds(document, [...partIds]) ?? {
    height: document.viewport.height,
    width: document.viewport.width,
    x: 0,
    y: 0,
  }
  const deformer = {
    bounds,
    children: node.children,
    columns: 2,
    id: node.id,
    kind: 'deformer',
    locked: node.locked,
    name: node.name,
    rotationOrigin: {x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height / 2},
    rows: 2,
    visible: node.visible,
  } as const

  return {...deformer, controlPoints: createDeformerControlPoints(deformer)}
}

const createConvertedGroup = (node: PuppetSceneDeformerNode): PuppetSceneGroupNode => ({
  children: node.children,
  id: node.id,
  kind: 'group',
  locked: node.locked,
  name: node.name,
  visible: node.visible,
})

const convertContainer = (
  document: PuppetDocument,
  node: PuppetSceneNode,
  targetKind: SceneContainerConversionTarget,
) => {
  if (targetKind === 'deformer' && node.kind === 'group') {
    return createConvertedDeformer(document, node)
  }

  if (targetKind === 'group' && node.kind === 'deformer') {
    return createConvertedGroup(node)
  }

  return node
}

export const convertSceneContainers = (
  options: ConvertSceneContainersOptions,
): PuppetDocument | undefined => {
  const scene = getDocumentScene(options.document)
  const nodeIds = new Set(options.nodeIds)
  const nodes = options.nodeIds.flatMap((nodeId) => {
    const node = findNode(scene.roots, nodeId)
    return node === undefined ? [] : [node]
  })
  const sourceKind = options.targetKind === 'deformer' ? 'group' : 'deformer'

  if (
    nodeIds.size === 0 ||
    nodes.length !== nodeIds.size ||
    nodes.some((node) => node.kind !== sourceKind || isSceneNodeLocked(options.document, node.id))
  ) {
    return undefined
  }

  let {roots} = scene
  for (const node of nodes) {
    roots = updateNode(roots, node.id, (candidate) =>
      convertContainer(options.document, candidate, options.targetKind),
    )
  }

  const document = {...options.document, scene: {...scene, roots}}
  return options.targetKind === 'group' ? removeDeformerTargets(document, nodeIds) : document
}
