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
    const roots = update(scene.roots)
    return roots === scene.roots ? scene : {...scene, roots}
  }

  let updated = false
  const updateNodes = (nodes: ReadonlyArray<PuppetSceneNode>): ReadonlyArray<PuppetSceneNode> =>
    mapNodes(nodes, (node) => {
      if (!isSceneContainerNode(node)) {
        return node
      }

      if (node.id === parentId) {
        updated = true
        const children = update(node.children)
        return children === node.children ? node : {...node, children}
      }

      const children = updateNodes(node.children)
      return children === node.children ? node : {...node, children}
    })

  const roots = updateNodes(scene.roots)
  return updated ? (roots === scene.roots ? scene : {...scene, roots}) : undefined
}

const mapNodes = (
  nodes: ReadonlyArray<PuppetSceneNode>,
  update: (node: PuppetSceneNode) => PuppetSceneNode,
): ReadonlyArray<PuppetSceneNode> => {
  const next = nodes.map(update)
  return next.every((node, index) => node === nodes[index]) ? nodes : next
}

export const updateNode = (
  nodes: ReadonlyArray<PuppetSceneNode>,
  nodeId: string,
  update: (node: PuppetSceneNode) => PuppetSceneNode,
): ReadonlyArray<PuppetSceneNode> =>
  mapNodes(nodes, (node) => {
    if (node.id === nodeId) {
      return update(node)
    }

    if (!isSceneContainerNode(node)) {
      return node
    }

    const children = updateNode(node.children, nodeId, update)
    return children === node.children ? node : {...node, children}
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

export const getContainerIds = (nodes: ReadonlyArray<PuppetSceneNode>) => {
  const groupIds = new Set<string>()

  for (const node of nodes) {
    if (isSceneContainerNode(node)) {
      groupIds.add(node.id)
      for (const childId of getContainerIds(node.children)) {
        groupIds.add(childId)
      }
    }
  }

  return groupIds
}
