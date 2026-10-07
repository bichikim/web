import type {FileTreeNode} from './types'

/** Flattens the expanded hierarchy in reading order. */
export const getVisibleNodes = (
  nodes: readonly FileTreeNode[],
  expanded: (path: string) => boolean,
): FileTreeNode[] =>
  nodes.flatMap((node) =>
    node.kind === 'directory' && expanded(node.path)
      ? [node, ...getVisibleNodes(node.children, expanded)]
      : [node],
  )
