import {
  getDocumentScene,
  type PuppetDocument,
  type PuppetSceneDeformerNode,
  type PuppetSceneGroupNode,
  type PuppetSceneNode,
} from '../../player'
import {getDeformerBounds} from './deformer-bounds'
import {createDeformerControlPoints} from './grid-control-points'
import {isSceneNodeLocked, removeParameterDeformerTargets} from './scene-graph'
import {collectPartIds, findNode, updateNode} from './scene-tree'

export type SceneContainerConversionTarget = 'deformer' | 'group' | 'curve' | 'bone' | 'pin'

export interface SceneContainerConversion {
  readonly nodeIds: ReadonlyArray<string>
  readonly targetKind: SceneContainerConversionTarget
}

export interface ConvertSceneContainersOptions extends SceneContainerConversion {
  readonly document: PuppetDocument
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

export const getContainerKind = (node: PuppetSceneNode): SceneContainerConversionTarget =>
  node.kind === 'deformer'
    ? node.pins === undefined
      ? node.boneRestPoints === undefined
        ? node.curveAxis === undefined
          ? 'deformer'
          : 'curve'
        : 'bone'
      : 'pin'
    : 'group'

const convertContainer = (
  document: PuppetDocument,
  node: PuppetSceneNode,
  targetKind: SceneContainerConversionTarget,
): PuppetSceneNode => {
  if (node.kind === 'part') {
    return node
  }
  const group = node.kind === 'group' ? node : createConvertedGroup(node)
  if (targetKind === 'group') {
    return group
  }
  const base = createConvertedDeformer(document, group)
  if (targetKind === 'deformer') {
    return base
  }
  const {bounds} = base
  if (targetKind === 'pin') {
    const x = bounds.x + bounds.width / 2
    const y = bounds.y + bounds.height / 2
    return {
      ...base,
      columns: 1,
      rotationOrigin: undefined,
      rows: 1,
      controlPoints: [x, y],
      pins: [{x, radius: Math.max(bounds.width, bounds.height) / 2, y, strength: 1}],
    }
  }
  const axis = bounds.height > bounds.width ? 'y' : 'x'
  const CUBIC_POINTS = 4
  const count = targetKind === 'bone' ? 2 : CUBIC_POINTS
  const controlPoints = Array.from({length: count}, (_, index) =>
    axis === 'x'
      ? [bounds.x + (bounds.width * index) / (count - 1), bounds.y + bounds.height / 2]
      : [bounds.x + bounds.width / 2, bounds.y + (bounds.height * index) / (count - 1)],
  ).flat()
  return {
    ...base,
    boneRestPoints: targetKind === 'bone' ? controlPoints : undefined,
    columns: 1,
    controlPoints,
    curveAxis: targetKind === 'curve' ? axis : undefined,
    rotationOrigin: undefined,
    rows: 1,
  }
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

  if (
    nodeIds.size === 0 ||
    nodes.length !== nodeIds.size ||
    nodes.some(
      (node) =>
        node.kind === 'part' ||
        getContainerKind(node) === options.targetKind ||
        isSceneNodeLocked(options.document, node.id),
    )
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
  return removeParameterDeformerTargets(
    document,
    new Set(nodes.filter((node) => node.kind === 'deformer').map((node) => node.id)),
  )
}
