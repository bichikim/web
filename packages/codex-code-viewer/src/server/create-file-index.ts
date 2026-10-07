import {type FSWatcher, statSync, watch} from 'node:fs'
import type {WorkspaceTree} from '../shared/contracts'
import {readDirectory} from './read-directory'
import {fileRevision} from './file-revision'
import {isBrowsablePath} from './is-browsable-path'

export interface FileIndex {
  dispose(): void
  list(query: string): string[]
  tree(): WorkspaceTree
}
const MAX_RESULTS = 100

const unchanged = (listing: ReturnType<typeof readDirectory>): boolean => {
  try {
    return listing.directories.every(
      (directory) => fileRevision(statSync(directory.path, {bigint: true})) === directory.revision,
    )
  } catch {
    return false
  }
}
/** Shares workspace discovery and validates directory changes before returning cached paths. */
export const createFileIndex = (root: string): FileIndex => {
  let cached: ReturnType<typeof readDirectory> | null = null
  let dirty = false
  let watcher: FSWatcher | null = null
  try {
    watcher = watch(root, {persistent: false, recursive: true}, (event, filename) => {
      if (event === 'rename' && (filename === null || isBrowsablePath(filename.toString()))) {
        dirty = true
      }
    })
    watcher.on('error', () => {
      dirty = true
      watcher?.close()
      watcher = null
    })
  } catch {
    // Directory revisions cover platforms or directories without watch support.
    watcher = null
  }
  const snapshot = (): ReturnType<typeof readDirectory> => {
    if (cached === null || dirty || !unchanged(cached)) {
      cached = readDirectory(root)
      dirty = false
    }
    return cached
  }
  return {
    dispose: () => {
      watcher?.close()
      watcher = null
      cached = null
    },
    list: (query: string): string[] => {
      const needle = query.toLowerCase()
      return snapshot()
        .files.filter((file) => file.openable && file.path.toLowerCase().includes(needle))
        .map((file) => file.path)
        .sort()
        .slice(0, MAX_RESULTS)
    },
    tree: () => {
      const listing = snapshot()
      return {files: listing.files.map((file) => ({...file})), truncated: listing.truncated}
    },
  }
}
