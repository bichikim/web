import {
  getDocumentScene,
  type PuppetDocument,
  type PuppetScene,
  type PuppetSceneGroupNode,
  type PuppetSceneNode,
} from '../../player'

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

interface SetSceneNodeStateOptions {
  readonly document: PuppetDocument
  readonly locked?: boolean
  readonly nodeId: string
  readonly visible?: boolean
}

const findNode = (
  nodes: ReadonlyArray<PuppetSceneNode>,
  nodeId: string,
): PuppetSceneNode | undefined => {
  for (const node of nodes) {
    if (node.id === nodeId) {
      return node
    }

    if (node.kind === 'group') {
      const child = findNode(node.children, nodeId)

      if (child !== undefined) {
        return child
      }
    }
  }

  return undefined
}

const findParentId = (
  nodes: ReadonlyArray<PuppetSceneNode>,
  nodeId: string,
  parentId: string | null = null,
): string | null | undefined => {
  for (const node of nodes) {
    if (node.id === nodeId) {
      return parentId
    }

    if (node.kind === 'group') {
      const childParentId = findParentId(node.children, nodeId, node.id)

      if (childParentId !== undefined) {
        return childParentId
      }
    }
  }

  return undefined
}

const findNodeLock = (
  nodes: ReadonlyArray<PuppetSceneNode>,
  nodeId: string,
  inheritedLocked = false,
): boolean | undefined => {
  for (const node of nodes) {
    const locked = inheritedLocked || node.locked

    if (node.id === nodeId) {
      return locked
    }

    if (node.kind === 'group') {
      const childLock = findNodeLock(node.children, nodeId, locked)

      if (childLock !== undefined) {
        return childLock
      }
    }
  }

  return undefined
}

const updateChildren = (
  scene: PuppetScene,
  parentId: string | null,
  update: (children: ReadonlyArray<PuppetSceneNode>) => ReadonlyArray<PuppetSceneNode>,
): PuppetScene | undefined => {
  if (parentId === null) {
    return {...scene, roots: update(scene.roots)}
  }

  let updated = false
  const updateNodes = (nodes: ReadonlyArray<PuppetSceneNode>): ReadonlyArray<PuppetSceneNode> =>
    nodes.map((node) => {
      if (node.kind !== 'group') {
        return node
      }

      if (node.id === parentId) {
        updated = true
        return {...node, children: update(node.children)}
      }

      const children = updateNodes(node.children)
      return children === node.children ? node : {...node, children}
    })

  const roots = updateNodes(scene.roots)
  return updated ? {...scene, roots} : undefined
}

const updateNode = (
  nodes: ReadonlyArray<PuppetSceneNode>,
  nodeId: string,
  update: (node: PuppetSceneNode) => PuppetSceneNode,
): ReadonlyArray<PuppetSceneNode> =>
  nodes.map((node) => {
    if (node.id === nodeId) {
      return update(node)
    }

    if (node.kind !== 'group') {
      return node
    }

    return {...node, children: updateNode(node.children, nodeId, update)}
  })

const collectNodeIds = (nodes: ReadonlyArray<PuppetSceneNode>, ids: Set<string>) => {
  for (const node of nodes) {
    ids.add(node.id)

    if (node.kind === 'group') {
      collectNodeIds(node.children, ids)
    }
  }
}

const collectPartIds = (node: PuppetSceneNode, partIds: Set<string>) => {
  if (node.kind === 'part') {
    partIds.add(node.id)
    return
  }

  for (const child of node.children) {
    collectPartIds(child, partIds)
  }
}

const createGroupId = (scene: PuppetScene) => {
  const ids = new Set<string>()
  collectNodeIds(scene.roots, ids)

  let suffix = 1
  let id = 'group'

  while (ids.has(id)) {
    suffix += 1
    id = `group-${suffix}`
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
): PuppetDocument | undefined => {
  const scene = getDocumentScene(document)
  const selectedIds = new Set(selectedNodeIds)
  const selectedNodes = selectedNodeIds.flatMap((nodeId) => {
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
    selectedNodeIds.some((nodeId) => isSceneNodeLocked(document, nodeId))
  ) {
    return undefined
  }

  const parentId = parentIds.values().next().value ?? null
  const id = createGroupId(scene)
  const nextScene = updateChildren(scene, parentId, (children) => {
    const groupedChildren = children.filter((child) => selectedIds.has(child.id))

    if (groupedChildren.length === 0) {
      return [...children, createGroupNode(id, [])]
    }

    const insertionIndex = children.findIndex((child) => selectedIds.has(child.id))
    const remainingChildren = children.filter((child) => !selectedIds.has(child.id))
    return [
      ...remainingChildren.slice(0, insertionIndex),
      createGroupNode(id, groupedChildren),
      ...remainingChildren.slice(insertionIndex),
    ]
  })

  return nextScene === undefined ? undefined : withScene(document, nextScene)
}

export const renameSceneGroup = (
  document: PuppetDocument,
  groupId: string,
  name: string,
): PuppetDocument | undefined => {
  const normalizedName = name.trim()
  const scene = getDocumentScene(document)
  const node = findNode(scene.roots, groupId)

  if (
    node?.kind !== 'group' ||
    isSceneNodeLocked(document, groupId) ||
    normalizedName.length === 0
  ) {
    return undefined
  }

  return withScene(document, {
    ...scene,
    roots: updateNode(scene.roots, groupId, (candidate) => ({
      ...(candidate as PuppetSceneGroupNode),
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

export const ungroupSceneNode = (
  document: PuppetDocument,
  groupId: string,
): PuppetDocument | undefined => {
  const scene = getDocumentScene(document)
  const group = findNode(scene.roots, groupId)
  const parentId = findParentId(scene.roots, groupId)

  if (group?.kind !== 'group' || parentId === undefined || isSceneNodeLocked(document, groupId)) {
    return undefined
  }

  const nextScene = updateChildren(scene, parentId, (children) =>
    children.flatMap((child) => (child.id === groupId ? group.children : [child])),
  )
  return nextScene === undefined ? undefined : withScene(document, nextScene)
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
    (options.parentId !== null && destination?.kind !== 'group') ||
    (node.kind === 'group' && findNode(node.children, options.parentId ?? '') !== undefined) ||
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
      : (findNode(scene.roots, grandparentId) as PuppetSceneGroupNode).children
  const parentIndex = parentSiblings.findIndex((node) => node.id === parentNode?.id)
  const beforeNodeId = parentSiblings[parentIndex + 1]?.id

  return moveSceneNode({beforeNodeId, document, nodeId, parentId: grandparentId})
}
