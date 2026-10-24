import {type FSWatcher, realpathSync, watch} from 'node:fs'
import {basename, dirname, relative, resolve, sep} from 'node:path'
import type {ScanBatch, WorkspaceTree} from '../shared/contracts'
import {type DirectoryListing} from './read-directory'
import {createDirectoryCache} from './create-directory-cache'
import {isWithin} from './file-access'
import {isBrowsablePath} from './is-browsable-path'

export interface FileChange {
  readonly path: string | null
  readonly event: string
}
export interface FileIndex {
  dispose(): void
  list(query: string): Promise<string[]>
  observe(directories: readonly string[]): void
  open(path: string): void
  scan(
    directories: readonly string[] | undefined,
    signal: AbortSignal,
    versions?: Readonly<Record<string, string>>,
  ): AsyncGenerator<ScanBatch>
  subscribe(listener: () => void): () => void
  subscribeChanges(listener: (change: FileChange) => void): () => void
  tree(): Promise<WorkspaceTree>
}
const BATCH_SIZE = 256
const MAX_RESULTS = 100
const normalize = (root: string, path: string): string => relative(root, path).split(sep).join('/')

function* batches(root: string, listing: DirectoryListing): Generator<ScanBatch> {
  const directory = normalize(root, listing.directories[0].path)
  const directories = listing.directories.slice(1).map((entry) => normalize(root, entry.path))
  const count = Math.max(directories.length, listing.files.length, 1)
  for (let offset = 0; offset < count; offset += BATCH_SIZE) {
    yield {
      complete: listing.complete !== false && offset + BATCH_SIZE >= count,
      directories: directories.slice(offset, offset + BATCH_SIZE),
      directory,
      failed: listing.truncated,
      files: listing.files.slice(offset, offset + BATCH_SIZE).map((file) => ({...file})),
      ...(listing.version !== undefined && offset + BATCH_SIZE >= count
        ? {version: listing.version}
        : {}),
    }
  }
}

const collectFilePaths = async (
  source: AsyncIterable<ScanBatch>,
  query: string,
): Promise<string[]> => {
  const listings = await Array.fromAsync(source)
  if (listings.some((listing) => listing.failed)) {
    throw new Error('Some workspace directories could not be read')
  }
  const needle = query.toLowerCase()
  return listings
    .flatMap((listing) => listing.files)
    .filter((file) => file.openable && file.path.toLowerCase().includes(needle))
    .map((file) => file.path)
    .sort()
    .slice(0, MAX_RESULTS)
}

/** Discovers paths asynchronously and limits live invalidation to observed directories and the opened file. */
export const createFileIndex = (root: string): FileIndex => {
  const canonical = realpathSync(root)
  const cache = createDirectoryCache(canonical)
  const listeners = new Set<() => void>()
  const changes = new Set<(change: FileChange) => void>()
  const lifetime = new AbortController()
  let observed = new Set<string>()
  let opened: string | null = null
  let watcher: FSWatcher | null = null
  const ignored = (path: string): boolean =>
    !isBrowsablePath(normalize(canonical, path)) || cache.excluded(path)
  const notify = (path: string | null, parent: string | null, event: string): void => {
    const currentChanged =
      opened !== null && path !== null && (path === opened || opened.startsWith(`${path}${sep}`))
    const entriesChanged = event === 'rename' && parent !== null && observed.has(parent)
    if (path === null || currentChanged || entriesChanged) {
      listeners.forEach((listener) => listener())
    }
  }
  const changed = (event: string, path: string | null): void => {
    const marker = path !== null && event === 'rename' && basename(path) === 'pyvenv.cfg'
    if (path !== null && path !== opened && !marker && ignored(path)) {
      return
    }
    changes.forEach((listener) =>
      listener({event, path: path === null ? null : normalize(canonical, path)}),
    )
    // A virtual environment becoming ordinary source changes its parent's visible entry.
    const parent = path === null ? null : marker ? dirname(dirname(path)) : dirname(path)
    if (parent === null) {
      cache.clear()
    } else if (event === 'rename') {
      cache.invalidate(parent)
      if (path !== null) {
        cache.invalidate(path)
      }
      if (marker) {
        cache.resetPolicy(parent)
      }
    }
    notify(path, parent, event)
  }
  try {
    watcher = watch(root, {persistent: false, recursive: true}, (event, filename) => {
      if (!lifetime.signal.aborted) {
        changed(event, filename === null ? null : resolve(canonical, filename.toString()))
      }
    })
    watcher.on('error', () => {
      cache.clear()
      watcher?.close()
      watcher = null
      changes.forEach((listener) => listener({event: 'change', path: null}))
      listeners.forEach((listener) => listener())
    })
  } catch {
    watcher = null
  }
  async function* scan(
    directories: readonly string[] | undefined,
    requestedSignal: AbortSignal,
    versions: Readonly<Record<string, string>> = {},
  ): AsyncGenerator<ScanBatch> {
    const signal = AbortSignal.any([lifetime.signal, requestedSignal])
    signal.throwIfAborted()
    const recursive = directories === undefined
    const pending = [...new Set(directories ?? [''])].sort(
      (left, right) => left.split('/').length - right.split('/').length,
    )
    async function* visit(path: string): AsyncGenerator<ScanBatch> {
      signal.throwIfAborted()
      const directory = resolve(canonical, path)
      if (!isWithin(canonical, directory) || (path !== '' && ignored(directory))) {
        return
      }
      try {
        for await (const listing of cache.scan(directory, signal)) {
          if (recursive) {
            pending.push(
              ...listing.directories.slice(1).map((entry) => normalize(canonical, entry.path)),
            )
          }
          if (recursive || listing.version === undefined || versions[path] !== listing.version) {
            // oxlint-disable-next-line eslint-js/yield-star-spacing -- Oxfmt formats generator delegation with this spacing.
            yield* batches(canonical, listing)
          }
        }
      } catch (error) {
        signal.throwIfAborted()
        if (recursive && path === '') {
          throw error
        }
        yield {complete: true, directories: [], directory: path, failed: true, files: []}
      }
    }
    for (let cursor = 0; cursor < pending.length; cursor += 1) {
      // oxlint-disable-next-line eslint-js/yield-star-spacing -- Oxfmt formats generator delegation with this spacing.
      yield* visit(pending[cursor])
    }
  }
  return {
    dispose: () => {
      lifetime.abort()
      listeners.clear()
      changes.clear()
      watcher?.close()
      cache.clear()
    },
    list: (query) => collectFilePaths(scan(undefined, lifetime.signal), query),
    observe: (directories) => {
      const next = new Set(
        directories
          .map((path) => resolve(canonical, path))
          .filter((path) => isWithin(canonical, path)),
      )
      for (const directory of next) {
        if (!observed.has(directory)) {
          cache.invalidate(directory)
        }
      }
      observed = next
    },
    open: (path) => {
      opened = resolve(canonical, path)
    },
    scan,
    subscribe: (listener) => {
      if (!lifetime.signal.aborted) {
        listeners.add(listener)
      }
      return () => {
        listeners.delete(listener)
      }
    },
    subscribeChanges: (listener) => {
      changes.add(listener)
      return () => changes.delete(listener)
    },
    tree: async () => {
      const listings = await Array.fromAsync(scan(undefined, lifetime.signal))
      return {
        directories: listings.flatMap((listing) => listing.directories),
        files: listings.flatMap((listing) => listing.files),
        truncated: listings.some((listing) => listing.failed),
      }
    },
  }
}
