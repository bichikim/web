import {relative, resolve, sep} from 'node:path'
import type {FileIndex} from '../create-file-index'
import {createDependencyGraph} from './create-dependency-graph'
import {createModuleResolver} from './create-module-resolver'
import {isNavigationConfiguration} from './is-navigation-configuration'
import {readSourceUpdates} from './read-source-updates'
import {readChangedPaths} from './read-changed-paths'
import {isAnalyzableFile, readNavigationFiles} from './read-navigation-files'
import type {IndexedSource, NavigationIndex} from './types'
interface NavigationIndexOptions {
  readonly root: string
  readonly changes: Pick<FileIndex, 'subscribeChanges'>
  readonly onConfigurationChange?: () => void
}
const relevantChange = (path: string | null, event: string): boolean =>
  path === null || isNavigationConfiguration(path) || isAnalyzableFile(path) || event === 'rename'

/** Lazily refreshes changed source summaries and candidate membership independently of visible files. */
export const createNavigationIndex = (options: NavigationIndexOptions): NavigationIndex => {
  const graph = createDependencyGraph()
  const sources = new Map<string, IndexedSource>()
  let directories: ReadonlyMap<string, string> = new Map()
  let configurations: ReadonlyMap<string, string | null> = new Map()
  const dirty = new Set<string>()
  const lifetime = new AbortController()
  let rescan = true
  let reconfigure = false
  let revision = 0
  let generation = 0
  let broadRevision = 0
  let pending: Promise<number> | null = null
  const unsubscribe = options.changes.subscribeChanges(({event, path}) => {
    if (relevantChange(path, event)) {
      generation += 1
      if (path === null) {
        rescan = true
        reconfigure = true
      } else {
        dirty.add(path)
        rescan ||= event === 'rename'
        reconfigure ||= isNavigationConfiguration(path)
      }
    }
  })
  const apply = (path: string, source: IndexedSource | null, version: number): void => {
    if (source === null) {
      sources.delete(path)
      graph.update(path, null, version)
    } else {
      sources.set(path, source)
    }
  }
  const probe = async (): Promise<void> => {
    const checkpoints = new Map(
      [...sources].map(([path, source]) => [resolve(options.root, path), source.revision]),
    )
    directories.forEach((version, path) => checkpoints.set(path, version))
    configurations.forEach((version, path) => checkpoints.set(path, version ?? 'unreadable'))
    const changes = await readChangedPaths(checkpoints, lifetime.signal)
    if (changes.length > 0) {
      generation += 1
    }
    changes.forEach((path) => {
      if (directories.has(path)) {
        rescan = true
      } else {
        dirty.add(relative(options.root, path).split(sep).join('/'))
        reconfigure ||= configurations.has(path)
      }
    })
  }
  const refresh = async (): Promise<number> => {
    await probe()
    do {
      lifetime.signal.throwIfAborted()
      const paths = new Set(dirty)
      dirty.clear()
      let reset = reconfigure
      reconfigure = false
      const discover = rescan || reset
      rescan = false
      let entries: Set<string> | null = null
      if (discover) {
        // oxlint-disable-next-line no-await-in-loop -- Drain changes arriving during discovery before validating a query.
        const listing = await readNavigationFiles(options.root, lifetime.signal)
        reset ||=
          configurations.size !== listing.configurations.size ||
          [...configurations].some(
            ([path, version]) => listing.configurations.get(path) !== version,
          )
        ;({directories, configurations} = listing)
        entries = listing.files
        entries.forEach((path) => {
          if (reset || !sources.has(path)) {
            paths.add(path)
          }
        })
        sources.forEach((_, path) => {
          if (!entries?.has(path)) {
            paths.add(path)
          }
        })
      }
      if (paths.size > 0 || reset) {
        revision += 1
        if (reset) {
          broadRevision = revision
          options.onConfigurationChange?.()
        }
        const candidates = [...paths].filter(isAnalyzableFile)
        const version = revision
        // oxlint-disable-next-line no-await-in-loop -- Apply bounded source updates before resolving graph edges.
        for await (const {path, source} of readSourceUpdates({
          generation,
          paths: candidates,
          root: options.root,
          signal: lifetime.signal,
          sources,
        })) {
          apply(path, entries !== null && !entries.has(path) ? null : source, version)
        }
        const resolve = createModuleResolver(options.root, sources)
        // File additions can make previously unresolved imports resolvable.
        const relationships = discover ? [...sources.keys()] : candidates
        relationships.forEach((path) => {
          const source = sources.get(path)
          if (source !== undefined) {
            graph.update(path, resolve(path, source), version)
          }
        })
      }
    } while (dirty.size > 0 || rescan || reconfigure)
    return revision
  }
  return {
    changed: graph.changed,
    dispose: () => {
      lifetime.abort()
      unsubscribe()
      graph.clear()
      sources.clear()
      directories = new Map()
      configurations = new Map()
      dirty.clear()
    },
    generation: () => generation,
    refresh: async (signal) => {
      signal.throwIfAborted()
      pending ??= refresh().catch((error: unknown) => {
        rescan = true
        reconfigure = true
        throw error
      })
      const current = pending
      try {
        const result = await current
        signal.throwIfAborted()
        return result
      } finally {
        if (pending === current) {
          pending = null
        }
      }
    },
    scope: graph.scope,
    uncertain: (since) => broadRevision > since || graph.uncertain(since),
  }
}
