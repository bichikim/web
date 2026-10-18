import type {FileTreeNode} from './types'

/** Filters sorted paths while retaining matching descendants and their ancestors. */
export const filterFileTree = (nodes: readonly FileTreeNode[], query: string): FileTreeNode[] => {
  const needle = query.toLowerCase()
  return nodes.flatMap((node) => {
    if (node.path.toLowerCase().includes(needle)) {
      return [node]
    }
    if (node.kind === 'file') {
      return []
    }
    const children = filterFileTree(node.children, needle)
    return children.length === 0 ? [] : [{...node, children}]
  })
}
