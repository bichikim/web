import type {ChangedFile} from '../../shared/change-contracts'
import type {FileTreeNode} from './types'
import {buildFileTree} from './build-file-tree'
import {filterFileTree} from './filter-file-tree'

const flatten = (nodes: readonly FileTreeNode[]): readonly FileTreeNode[] =>
  nodes.flatMap((node) => (node.kind === 'directory' ? [node, ...flatten(node.children)] : [node]))

/** Overlays Git changes and deleted paths without changing the cached disk tree or normal expansion. */
export const mergeChangedTree = (
  nodes: readonly FileTreeNode[],
  changes: readonly ChangedFile[],
  changedOnly: boolean,
  query = '',
): readonly FileTreeNode[] => {
  const entries = changedOnly ? [] : flatten(nodes)
  const files = new Map(
    entries.filter((node) => node.kind === 'file').map((node) => [node.path, node]),
  )
  for (const change of changes) {
    files.set(change.path, {
      change: change.kind,
      kind: 'file',
      name: change.path.split('/').at(-1) ?? change.path,
      openable: change.kind === 'deleted' || change.openable,
      path: change.path,
    })
  }
  const tree = buildFileTree(
    [...files.values()],
    entries.filter((node) => node.kind === 'directory').map((node) => node.path),
  )
  const needle = query.trim().toLowerCase()
  return needle === '' ? tree : filterFileTree(tree, needle)
}
