import type {WorkspaceFile} from '../../shared/contracts'
import type {FileTreeFolder, FileTreeNode} from './types'

const sortNodes = (nodes: FileTreeNode[]): void => {
  nodes.sort((left, right) =>
    left.kind === right.kind
      ? left.name.localeCompare(right.name, undefined, {numeric: true})
      : left.kind === 'directory'
        ? -1
        : 1,
  )
  for (const node of nodes) {
    if (node.kind === 'directory') {
      sortNodes(node.children)
    }
  }
}

/** Builds a folder-first hierarchy from unique workspace-relative file paths. */
export const buildFileTree = (files: readonly WorkspaceFile[]): FileTreeNode[] => {
  const roots: FileTreeNode[] = []
  const folders = new Map<string, FileTreeFolder>()
  const unique = new Map(files.map((file) => [file.path, file]))
  for (const file of unique.values()) {
    const parts = file.path.split('/')
    const name = parts.pop() ?? ''
    let children = roots
    let path = ''
    for (const part of parts) {
      path = path === '' ? part : `${path}/${part}`
      let folder = folders.get(path)
      if (folder === undefined) {
        folder = {children: [], kind: 'directory', name: part, path}
        folders.set(path, folder)
        children.push(folder)
      }
      const {children: folderChildren} = folder
      children = folderChildren
    }
    children.push({...file, kind: 'file', name})
  }
  sortNodes(roots)
  return roots
}
