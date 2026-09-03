import {
  createDeformerControlPoints,
  getDocumentScene,
  isSceneContainerNode,
  type PuppetDocument,
  type PuppetParameterBinding,
  type PuppetParameterKeyform,
  type PuppetScene,
  type PuppetSceneContainerNode,
  type PuppetSceneDeformerNode,
  type PuppetSceneGroupNode,
  type PuppetSceneNode,
} from '../../player'
import {isTwoDimensionalParameterBinding} from '../../deformation'
import {getDeformerBounds} from './deformer-bounds'
import {
  isGridDivisionCount,
  resampleDeformerGrid,
  resampleGridControlPoints,
  resampleGridCurveHandles,
} from './grid-control-points'
import {
  collectNodeIds,
  collectPartIds,
  findNode,
  findNodeLock,
  findParentId,
  updateChildren,
  updateNode,
} from './scene-tree'

export interface SceneSelection {
  readonly activeNodeId: string | null
  readonly nodeIds: ReadonlyArray<string>
}

interface MoveSceneNodeOptions {
  readonly beforeNodeId?: string
  readonly document: PuppetDocument
  readonly nodeId: string
  readonly parentId: string | null
}

export type SceneNodeDropPosition = 'after' | 'before' | 'inside'

export interface MoveSceneNodeRelativeOptions {
  readonly document: PuppetDocument
  readonly nodeId: string
  readonly position: SceneNodeDropPosition
  readonly targetNodeId: string | null
}

interface SetSceneNodeStateOptions {
  readonly document: PuppetDocument
  readonly locked?: boolean
  readonly nodeId: string
  readonly visible?: boolean
}

interface ResizeDeformerOptions {
  readonly columns: number
  readonly document: PuppetDocument
  readonly nodeId: string
  readonly rows: number
}

const createNodeId = (scene: PuppetScene, prefix: string) => {
  const ids = new Set<string>()
  collectNodeIds(scene.roots, ids)

  let suffix = 1
  let id = prefix

  while (ids.has(id)) {
    suffix += 1
    id = `${prefix}-${suffix}`
  }

  return id
}

const createGroupNode = (id: string, children: ReadonlyArray<PuppetSceneNode>) =>
  ({
    children,
    id,
    kind: 'group',
    locked: false,
    name: '새 그룹',
    visible: true,
  }) satisfies PuppetSceneGroupNode

interface CreateSceneContainerOptions {
  readonly create: (
    id: string,
    children: ReadonlyArray<PuppetSceneNode>,
    partIds: ReadonlyArray<string>,
  ) => PuppetSceneContainerNode | undefined
  readonly document: PuppetDocument
  readonly prefix: string
  readonly selectedNodeIds: ReadonlyArray<string>
}

const createSceneContainer = (options: CreateSceneContainerOptions) => {
  const scene = getDocumentScene(options.document)
  const selectedIds = new Set(options.selectedNodeIds)
  const selectedNodes = options.selectedNodeIds.flatMap((nodeId) => {
    const node = findNode(scene.roots, nodeId)
    return node === undefined ? [] : [node]
  })
  const parentIds = new Set(
    selectedNodes
      .map((node) => findParentId(scene.roots, node.id))
      .filter((id) => id !== undefined),
  )

  if (
    selectedNodes.length !== selectedIds.size ||
    parentIds.size > 1 ||
    options.selectedNodeIds.some((nodeId) => isSceneNodeLocked(options.document, nodeId))
  ) {
    return undefined
  }

  const partIds = selectedNodes.flatMap((node) => {
    const ids = new Set<string>()
    collectPartIds(node, ids)
    return [...ids]
  })
  const parentId = parentIds.values().next().value ?? null
  const id = createNodeId(scene, options.prefix)
  const container = options.create(id, selectedNodes, partIds)

  if (container === undefined) {
    return undefined
  }

  const nextScene = updateChildren(scene, parentId, (children) => {
    const insertionIndex = children.findIndex((child) => selectedIds.has(child.id))
    const remainingChildren = children.filter((child) => !selectedIds.has(child.id))
    const index = insertionIndex < 0 ? remainingChildren.length : insertionIndex
    return [...remainingChildren.slice(0, index), container, ...remainingChildren.slice(index)]
  })

  return nextScene === undefined ? undefined : withScene(options.document, nextScene)
}

const withScene = (document: PuppetDocument, scene: PuppetScene): PuppetDocument => ({
  ...document,
  scene,
})

export const getSceneNode = (document: PuppetDocument, nodeId: string) =>
  findNode(getDocumentScene(document).roots, nodeId)

export const getSceneNodePartIds = (document: PuppetDocument, nodeId: string) => {
  const node = getSceneNode(document, nodeId)
  const partIds = new Set<string>()

  if (node !== undefined) {
    collectPartIds(node, partIds)
  }

  return [...partIds]
}

export const getSceneSelectionPartIds = (document: PuppetDocument, selection: SceneSelection) => {
  const partIds = new Set<string>()

  for (const nodeId of selection.nodeIds) {
    const node = getSceneNode(document, nodeId)

    if (node !== undefined) {
      collectPartIds(node, partIds)
    }
  }

  return [...partIds]
}

export const isSceneNodeLocked = (document: PuppetDocument, nodeId: string) =>
  findNodeLock(getDocumentScene(document).roots, nodeId) ?? false

export const createSceneGroup = (
  document: PuppetDocument,
  selectedNodeIds: ReadonlyArray<string>,
): PuppetDocument | undefined =>
  createSceneContainer({
    create: (id, children) => createGroupNode(id, children),
    document,
    prefix: 'group',
    selectedNodeIds,
  })

export const createDeformer = (
  document: PuppetDocument,
  selectedNodeIds: ReadonlyArray<string>,
): PuppetDocument | undefined =>
  createSceneContainer({
    create: (id, children, partIds) => {
      const bounds = getDeformerBounds(document, partIds)

      if (bounds === undefined) {
        return undefined
      }

      const deformer = {
        bounds,
        children,
        columns: 2,
        id,
        kind: 'deformer',
        locked: false,
        name: '새 자유 변형 디포머',
        rotationOrigin: {x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height / 2},
        rows: 2,
        visible: true,
      } as const

      return {
        ...deformer,
        controlPoints: createDeformerControlPoints(deformer),
      } satisfies PuppetSceneDeformerNode
    },
    document,
    prefix: 'deformer',
    selectedNodeIds,
  })

export const renameSceneNode = (
  document: PuppetDocument,
  groupId: string,
  name: string,
): PuppetDocument | undefined => {
  const normalizedName = name.trim()
  const scene = getDocumentScene(document)
  const node = findNode(scene.roots, groupId)

  if (
    node === undefined ||
    node.kind === 'part' ||
    isSceneNodeLocked(document, groupId) ||
    normalizedName.length === 0
  ) {
    return undefined
  }

  return withScene(document, {
    ...scene,
    roots: updateNode(scene.roots, groupId, (candidate) => ({
      ...candidate,
      name: normalizedName,
    })),
  })
}

export const setSceneNodeState = (
  options: SetSceneNodeStateOptions,
): PuppetDocument | undefined => {
  const scene = getDocumentScene(options.document)
  const node = findNode(scene.roots, options.nodeId)

  if (node === undefined) {
    return undefined
  }

  return withScene(options.document, {
    ...scene,
    roots: updateNode(scene.roots, options.nodeId, (candidate) => ({
      ...candidate,
      ...(options.locked === undefined ? {} : {locked: options.locked}),
      ...(options.visible === undefined ? {} : {visible: options.visible}),
    })),
  })
}

export const resizeDeformer = (options: ResizeDeformerOptions): PuppetDocument | undefined => {
  const scene = getDocumentScene(options.document)
  const node = findNode(scene.roots, options.nodeId)

  if (
    node?.kind !== 'deformer' ||
    isSceneNodeLocked(options.document, options.nodeId) ||
    !isGridDivisionCount(options.columns) ||
    !isGridDivisionCount(options.rows) ||
    (node.columns === options.columns && node.rows === options.rows)
  ) {
    return undefined
  }

  const document = withScene(options.document, {
    ...scene,
    roots: updateNode(scene.roots, options.nodeId, (candidate) =>
      resampleDeformerGrid({
        columns: options.columns,
        node: candidate as PuppetSceneDeformerNode,
        rows: options.rows,
      }),
    ),
  })

  if (document.parameterBindings === undefined) {
    return document
  }

  const resizeKeyform = <Keyform extends PuppetParameterKeyform>(keyform: Keyform): Keyform =>
    ({
      ...keyform,
      deformers: keyform.deformers?.map((deformer) =>
        deformer.kind === 'deformer' && deformer.nodeId === options.nodeId
          ? {
              ...deformer,
              controlPoints: resampleGridControlPoints({
                columns: node.columns,
                controlPoints: deformer.controlPoints,
                nextColumns: options.columns,
                nextRows: options.rows,
                rows: node.rows,
              }),
              curveHandles: resampleGridCurveHandles({
                columns: node.columns,
                controlPoints: deformer.controlPoints,
                curveHandles: deformer.curveHandles,
                nextColumns: options.columns,
                nextRows: options.rows,
                rows: node.rows,
              }),
            }
          : deformer,
      ),
    }) as Keyform

  return {
    ...document,
    parameterBindings: document.parameterBindings.map(
      (binding): PuppetParameterBinding =>
        isTwoDimensionalParameterBinding(binding)
          ? {...binding, keyforms: binding.keyforms.map(resizeKeyform)}
          : {...binding, keyforms: binding.keyforms.map(resizeKeyform)},
    ),
  }
}

export const unwrapSceneNode = (
  document: PuppetDocument,
  groupId: string,
): PuppetDocument | undefined => {
  const scene = getDocumentScene(document)
  const group = findNode(scene.roots, groupId)
  const parentId = findParentId(scene.roots, groupId)

  if (
    group === undefined ||
    !isSceneContainerNode(group) ||
    parentId === undefined ||
    isSceneNodeLocked(document, groupId)
  ) {
    return undefined
  }

  const nextScene = updateChildren(scene, parentId, (children) =>
    children.flatMap((child) => (child.id === groupId ? group.children : [child])),
  )
  return nextScene === undefined ? undefined : withScene(document, nextScene)
}

export const unwrapSceneNodes = (
  document: PuppetDocument,
  nodeIds: ReadonlyArray<string>,
): PuppetDocument | undefined => {
  if (nodeIds.length === 0) {
    return undefined
  }

  let nextDocument = document

  for (const nodeId of nodeIds) {
    const unwrappedDocument = unwrapSceneNode(nextDocument, nodeId)

    if (unwrappedDocument === undefined) {
      return undefined
    }

    nextDocument = unwrappedDocument
  }

  return nextDocument
}

export const moveSceneNode = (options: MoveSceneNodeOptions): PuppetDocument | undefined => {
  const scene = getDocumentScene(options.document)
  const node = findNode(scene.roots, options.nodeId)
  const sourceParentId = findParentId(scene.roots, options.nodeId)
  const destination =
    options.parentId === null ? undefined : findNode(scene.roots, options.parentId)

  if (
    node === undefined ||
    sourceParentId === undefined ||
    isSceneNodeLocked(options.document, options.nodeId) ||
    (options.parentId !== null && isSceneNodeLocked(options.document, options.parentId)) ||
    (options.parentId !== null &&
      (destination === undefined || !isSceneContainerNode(destination))) ||
    (isSceneContainerNode(node) && findNode(node.children, options.parentId ?? '') !== undefined) ||
    options.nodeId === options.parentId ||
    options.nodeId === options.beforeNodeId
  ) {
    return undefined
  }

  const detachedScene = updateChildren(scene, sourceParentId, (children) =>
    children.filter((child) => child.id !== options.nodeId),
  )

  if (detachedScene === undefined) {
    return undefined
  }

  const nextScene = updateChildren(detachedScene, options.parentId, (children) => {
    const insertionIndex =
      options.beforeNodeId === undefined
        ? children.length
        : children.findIndex((child) => child.id === options.beforeNodeId)
    const index = insertionIndex < 0 ? children.length : insertionIndex
    return [...children.slice(0, index), node, ...children.slice(index)]
  })

  return nextScene === undefined ? undefined : withScene(options.document, nextScene)
}

export const moveSceneNodeRelative = (
  options: MoveSceneNodeRelativeOptions,
): PuppetDocument | undefined => {
  if (options.targetNodeId === null) {
    return options.position === 'inside' ? moveSceneNode({...options, parentId: null}) : undefined
  }

  if (options.nodeId === options.targetNodeId) {
    return undefined
  }

  const scene = getDocumentScene(options.document)
  const target = findNode(scene.roots, options.targetNodeId)
  const parentId = findParentId(scene.roots, options.targetNodeId)

  if (target === undefined || parentId === undefined) {
    return undefined
  }

  switch (options.position) {
    case 'inside':
      return isSceneContainerNode(target)
        ? moveSceneNode({...options, parentId: target.id})
        : undefined
    case 'before':
      return moveSceneNode({...options, beforeNodeId: target.id, parentId})
    case 'after': {
      const parent = parentId === null ? undefined : findNode(scene.roots, parentId)
      const siblings =
        parentId === null
          ? scene.roots
          : parent !== undefined && isSceneContainerNode(parent)
            ? parent.children
            : []
      const targetIndex = siblings.findIndex((node) => node.id === target.id)
      const beforeNodeId = siblings[targetIndex + 1]?.id

      return targetIndex < 0 ? undefined : moveSceneNode({...options, beforeNodeId, parentId})
    }
    default: {
      const exhaustivePosition: never = options.position
      return exhaustivePosition
    }
  }
}

export const moveSceneNodeBy = (
  document: PuppetDocument,
  nodeId: string,
  offset: -1 | 1,
): PuppetDocument | undefined => {
  const scene = getDocumentScene(document)
  const parentId = findParentId(scene.roots, nodeId)

  if (parentId === undefined || isSceneNodeLocked(document, nodeId)) {
    return undefined
  }

  const nextScene = updateChildren(scene, parentId, (children) => {
    const index = children.findIndex((child) => child.id === nodeId)
    const destinationIndex = index + offset

    if (index < 0 || destinationIndex < 0 || destinationIndex >= children.length) {
      return children
    }

    const nextChildren = [...children]
    const [node] = nextChildren.splice(index, 1)

    if (node !== undefined) {
      nextChildren.splice(destinationIndex, 0, node)
    }

    return nextChildren
  })

  return nextScene === undefined ? undefined : withScene(document, nextScene)
}

export const moveSceneNodeToParent = (
  document: PuppetDocument,
  nodeId: string,
): PuppetDocument | undefined => {
  const scene = getDocumentScene(document)
  const parentId = findParentId(scene.roots, nodeId)

  if (parentId === undefined || parentId === null) {
    return undefined
  }

  const grandparentId = findParentId(scene.roots, parentId)

  if (grandparentId === undefined) {
    return undefined
  }

  const parentNode = findNode(scene.roots, parentId)
  const parentSiblings =
    grandparentId === null
      ? scene.roots
      : (findNode(scene.roots, grandparentId) as PuppetSceneContainerNode).children
  const parentIndex = parentSiblings.findIndex((node) => node.id === parentNode?.id)
  const beforeNodeId = parentSiblings[parentIndex + 1]?.id

  return moveSceneNode({beforeNodeId, document, nodeId, parentId: grandparentId})
}
