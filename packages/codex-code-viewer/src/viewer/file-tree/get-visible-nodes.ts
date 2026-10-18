import type {FileTreeNode} from './types'
import {filterFileTree} from './filter-file-tree'

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

/** Flattens expanded folders, or reveals a filter's matching descendants and ancestors. */
export const getVisibleNodes = (
  nodes: readonly FileTreeNode[],
  expanded: (path: string) => boolean,
  query = '',
): FileTreeNode[] =>
  Array.from(
    iterateVisibleNodes(
      query === '' ? nodes : filterFileTree(nodes, query),
      (path) => query !== '' || expanded(path),
    ),
  )
