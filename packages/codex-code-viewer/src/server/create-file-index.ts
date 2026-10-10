import {type FSWatcher, realpathSync, statSync, watch} from 'node:fs'
import type {WorkspaceTree} from '../shared/contracts'
import {relative, sep} from 'node:path'
import {readDirectory} from './read-directory'
import {fileRevision} from './file-revision'
import {isBrowsablePath} from './is-browsable-path'

export interface FileIndex {
  dispose(): void
  list(query: string): string[]
  subscribe(listener: () => void): () => void
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
  const canonical = realpathSync(root)
  let cached: ReturnType<typeof readDirectory> | null = null
  const listeners = new Set<() => void>()
  let disposed = false
  let dirty = false
  let watcher: FSWatcher | null = null
  try {
    watcher = watch(root, {persistent: false, recursive: true}, (event, filename) => {
      if (
        !disposed &&
        (filename === null || isBrowsablePath(filename.toString().split(sep).join('/')))
      ) {
        dirty = dirty || event === 'rename'
        for (const listener of listeners) {
          listener()
        }
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
      disposed = true
      listeners.clear()
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
    subscribe: (listener) => {
      if (!disposed) {
        listeners.add(listener)
      }
      return () => listeners.delete(listener)
    },
    tree: () => {
      const listing = snapshot()
      return {
        directories: listing.directories
          .slice(1)
          .map((directory) => relative(canonical, directory.path).split(sep).join('/')),
        files: listing.files.map((file) => ({...file})),
        truncated: listing.truncated,
      }
    },
  }
}
