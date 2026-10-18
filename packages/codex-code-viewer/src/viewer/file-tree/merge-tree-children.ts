import {compareTreeNodes} from './compare-tree-nodes'
import type {FileTreeNode} from './types'

/** Merges a new batch into sorted siblings, replacing duplicate paths. */
export const mergeTreeChildren = (
  previous: readonly FileTreeNode[],
  incoming: readonly FileTreeNode[],
): FileTreeNode[] => {
  const updates = new Map(incoming.map((node) => [node.path, node]))
  const added = [...updates.values()].sort(compareTreeNodes)
  const retained = previous.filter((node) => !updates.has(node.path))
  const merged: FileTreeNode[] = []
  let cursor = 0
  for (const node of retained) {
    while (cursor < added.length && compareTreeNodes(added[cursor], node) <= 0) {
      merged.push(added[cursor])
      cursor += 1
    }
    merged.push(node)
  }
  return [...merged, ...added.slice(cursor)]
}
