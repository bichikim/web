import type {FileTreeNode} from './types'

function* iterateVisibleNodes(
  nodes: readonly FileTreeNode[],
  expanded: (path: string) => boolean,
): Generator<FileTreeNode> {
  for (const node of nodes) {
    yield node
    if (node.kind === 'directory' && expanded(node.path)) {
      // oxlint-disable-next-line eslint-js/yield-star-spacing -- Oxfmt formats generator delegation with this spacing.
      yield* iterateVisibleNodes(node.children, expanded)
    }
  }
}

/** Flattens the expanded hierarchy in reading order. */
export const getVisibleNodes = (
  nodes: readonly FileTreeNode[],
  expanded: (path: string) => boolean,
): FileTreeNode[] => Array.from(iterateVisibleNodes(nodes, expanded))
