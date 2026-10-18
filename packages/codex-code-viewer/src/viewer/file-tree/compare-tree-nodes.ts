import type {FileTreeNode} from './types'

const collator = new Intl.Collator(undefined, {numeric: true})

/** Compares folders before files, then names in natural order. */
export const compareTreeNodes = (left: FileTreeNode, right: FileTreeNode): number =>
  left.kind === right.kind
    ? collator.compare(left.name, right.name)
    : left.kind === 'directory'
      ? -1
      : 1
