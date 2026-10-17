import type {ScanBatch} from '../../shared/contracts'
import {buildFileTree} from './build-file-tree'
import {mergeTreeChildren} from './merge-tree-children'
import type {FileTreeFolder, FileTreeNode} from './types'

const parent = (path: string): string => path.split('/').slice(0, -1).join('/')
const name = (path: string): string => path.split('/').at(-1) ?? ''

export interface TreeModel {
  begin(): void
  clear(): void
  node(path: string): FileTreeNode | undefined
  receive(entry: ScanBatch): void
  roots(): readonly FileTreeNode[]
  versions(directories: readonly string[]): Record<string, string>
}

/** Maintains sorted directory branches and completed versions across streamed refreshes. */
export const createTreeModel = (): TreeModel => {
  const root: FileTreeFolder = {children: [], kind: 'directory', name: '', path: ''}
  const nodes = new Map<string, FileTreeNode>([['', root]])
  const versions = new Map<string, string>()
  const pending = new Map<string, readonly FileTreeNode[]>()
  const folder = (path: string, attach = true): FileTreeFolder => {
    const existing = nodes.get(path)
    if (existing?.kind === 'directory') {
      return existing
    }
    const created: FileTreeFolder = {children: [], kind: 'directory', name: name(path), path}
    nodes.set(path, created)
    if (attach) {
      const owner = folder(parent(path))
      owner.children = mergeTreeChildren(owner.children, [created])
    }
    return created
  }
  const remove = (node: FileTreeNode): void => {
    if (node.kind === 'directory') {
      node.children.forEach(remove)
      versions.delete(node.path)
      pending.delete(node.path)
    }
    if (nodes.get(node.path) === node) {
      nodes.delete(node.path)
    }
  }
  const clear = (): void => {
    nodes.clear()
    nodes.set('', root)
    root.children = []
    versions.clear()
    pending.clear()
  }
  const register = (node: FileTreeNode): void => {
    nodes.set(node.path, node)
    if (node.kind === 'directory') {
      node.children.forEach(register)
    }
  }
  const prune = (path: string, previous: readonly FileTreeNode[]): void => {
    const current = nodes.get(path)
    const retained = new Set(
      current?.kind === 'directory' ? current.children.map((node) => node.path) : [],
    )
    previous.filter((node) => !retained.has(node.path)).forEach(remove)
  }
  const receive = (entry: ScanBatch): void => {
    if (entry.snapshot) {
      clear()
      root.children = buildFileTree(entry.files, entry.directories)
      root.children.forEach(register)
      return
    }
    if (
      entry.failed &&
      entry.files.length === 0 &&
      entry.directories.length === 0 &&
      nodes.get(entry.directory)?.kind !== 'directory'
    ) {
      return
    }
    const owner = folder(entry.directory)
    if (!pending.has(entry.directory)) {
      pending.set(entry.directory, owner.children)
      owner.children = []
      versions.delete(entry.directory)
    }
    const incoming: FileTreeNode[] = [
      ...entry.directories.map((path) => folder(path, false)),
      ...entry.files.map((file) => ({...file, kind: 'file' as const, name: name(file.path)})),
    ]
    incoming.forEach((node) => {
      const previous = nodes.get(node.path)
      if (previous !== undefined && previous.kind !== node.kind) {
        remove(previous)
      }
      nodes.set(node.path, node)
    })
    owner.children = mergeTreeChildren(owner.children, incoming)
    if (entry.complete) {
      prune(entry.directory, pending.get(entry.directory) ?? [])
      pending.delete(entry.directory)
      if (!entry.failed && entry.version !== undefined) {
        versions.set(entry.directory, entry.version)
      }
    }
  }
  return {
    begin: (): void => {
      for (const [path, previous] of pending) {
        prune(path, previous)
      }
      pending.clear()
    },
    clear,
    node: (path: string): FileTreeNode | undefined => nodes.get(path),
    receive,
    roots: (): FileTreeNode[] => root.children,
    versions: (directories: readonly string[]): Record<string, string> =>
      Object.fromEntries(
        directories.flatMap((path) => {
          const version = versions.get(path)
          return version === undefined ? [] : [[path, version]]
        }),
      ),
  }
}
