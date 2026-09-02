import {isSceneContainerNode, type PuppetScene, type PuppetSceneNode} from '../../player'

export const findNode = (
  nodes: ReadonlyArray<PuppetSceneNode>,
  nodeId: string,
): PuppetSceneNode | undefined => {
  for (const node of nodes) {
    if (node.id === nodeId) {
      return node
    }

    if (isSceneContainerNode(node)) {
      const child = findNode(node.children, nodeId)

      if (child !== undefined) {
        return child
      }
    }
  }

  return undefined
}

export const findParentId = (
  nodes: ReadonlyArray<PuppetSceneNode>,
  nodeId: string,
  parentId: string | null = null,
): string | null | undefined => {
  for (const node of nodes) {
    if (node.id === nodeId) {
      return parentId
    }

    if (isSceneContainerNode(node)) {
      const childParentId = findParentId(node.children, nodeId, node.id)

      if (childParentId !== undefined) {
        return childParentId
      }
    }
  }

  return undefined
}

export const findNodeLock = (
  nodes: ReadonlyArray<PuppetSceneNode>,
  nodeId: string,
  inheritedLocked = false,
): boolean | undefined => {
  for (const node of nodes) {
    const locked = inheritedLocked || node.locked

    if (node.id === nodeId) {
      return locked
    }

    if (isSceneContainerNode(node)) {
      const childLock = findNodeLock(node.children, nodeId, locked)

      if (childLock !== undefined) {
        return childLock
      }
    }
  }

  return undefined
}

export const updateChildren = (
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
      if (!isSceneContainerNode(node)) {
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

export const updateNode = (
  nodes: ReadonlyArray<PuppetSceneNode>,
  nodeId: string,
  update: (node: PuppetSceneNode) => PuppetSceneNode,
): ReadonlyArray<PuppetSceneNode> =>
  nodes.map((node) => {
    if (node.id === nodeId) {
      return update(node)
    }

    if (!isSceneContainerNode(node)) {
      return node
    }

    return {...node, children: updateNode(node.children, nodeId, update)}
  })

export const collectNodeIds = (nodes: ReadonlyArray<PuppetSceneNode>, ids: Set<string>) => {
  for (const node of nodes) {
    ids.add(node.id)

    if (isSceneContainerNode(node)) {
      collectNodeIds(node.children, ids)
    }
  }
}

export const collectPartIds = (node: PuppetSceneNode, partIds: Set<string>) => {
  if (node.kind === 'part') {
    partIds.add(node.id)
    return
  }

  for (const child of node.children) {
    collectPartIds(child, partIds)
  }
}
