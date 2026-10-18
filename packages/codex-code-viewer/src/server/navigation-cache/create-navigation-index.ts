import {relative, resolve, sep} from 'node:path'
import {withAbort} from '../with-abort'
import type {FileIndex} from '../create-file-index'
import {createStoredSources} from './create-stored-sources'
import {createDependencyGraph} from './create-dependency-graph'
import {createNavigationCheckpoint} from './create-navigation-checkpoint'
import {createModuleResolver} from './create-module-resolver'
import {isNavigationConfiguration} from './is-navigation-configuration'
import {readSourceUpdates} from './read-source-updates'
import {readChangedPaths} from './read-changed-paths'
import {isAnalyzableFile, readNavigationFiles} from './read-navigation-files'
import type {IndexedSource, NavigationIndex} from './types'
import type {createSourceIndexStore} from './create-source-index-store'
import type {SourceChange} from '../types'
interface NavigationIndexOptions {
  readonly root: string
  readonly storage?: ReturnType<typeof createSourceIndexStore>
  readonly changes: Pick<FileIndex, 'subscribeChanges'>
  readonly onConfigurationChange?: () => void
  readonly onSourcesChange?: (changes: readonly SourceChange[]) => void
}
const relevantChange = (path: string | null, event: string): boolean =>
  path === null || isNavigationConfiguration(path) || isAnalyzableFile(path) || event === 'rename'

const indexCheckpoints = (
  root: string,
  sources: ReadonlyMap<string, IndexedSource>,
  directories: ReadonlyMap<string, string>,
  configurations: ReadonlyMap<string, string | null>,
) =>
  new Map([
    ...[...sources].map(([path, source]) => [resolve(root, path), source.revision] as const),
    ...directories,
    ...[...configurations].map(([path, version]) => [path, version ?? 'unreadable'] as const),
  ])

const createSourceUpdater =
  (sources: Map<string, IndexedSource>, graph: ReturnType<typeof createDependencyGraph>) =>
  (
    path: string,
    source: IndexedSource | null,
    revision: number,
    entries: Set<string> | null,
  ): void => {
    if (source === null || (entries !== null && !entries.has(path))) {
      sources.delete(path)
      graph.update(path, null, revision)
    } else {
      sources.set(path, source)
    }
  }

const configurationKey = (values: ReadonlyMap<string, string | null>): string =>
  JSON.stringify([...values].sort(([left], [right]) => left.localeCompare(right)))

const configurationObserver = (configure: (signature: string) => void, changed?: () => void) => {
  let observed: string | undefined
  return (configuration: string, notify = true): void => {
    configure(configuration)
    if (configuration !== observed) {
      const initialized = observed !== undefined
      observed = configuration
      if (notify && initialized) {
        changed?.()
      }
    }
  }
}

const createRelationshipUpdater =
  (
    root: string,
    sources: ReadonlyMap<string, IndexedSource>,
    graph: ReturnType<typeof createDependencyGraph>,
  ) =>
  (paths: readonly string[], revision: number): void => {
    const resolve = createModuleResolver(root, sources)
    for (const path of paths) {
      const source = sources.get(path)
      if (source !== undefined) {
        graph.update(path, resolve(path, source), revision)
      }
    }
  }

const checkpointReader = (
  options: NavigationIndexOptions,
  lifetime: AbortSignal,
  observe: (configuration: string) => void,
) => {
  let pending: ReturnType<typeof createNavigationCheckpoint> | undefined
  let previous: Awaited<ReturnType<typeof createNavigationCheckpoint>> | undefined
  return async (signal: AbortSignal) => {
    signal.throwIfAborted()
    pending ??= (async () => {
      if (previous !== undefined && (await previous.unchanged(lifetime))) {
        return previous
      }
      const checkpoint = await createNavigationCheckpoint(options.root, lifetime)
      observe(checkpoint.configuration ?? '[]')
      previous = checkpoint
      return checkpoint
    })()
    const current = pending
    // A cancelled caller must not discard discovery shared with a file-open warmup.
    const release = current.finally(() => {
      if (pending === current) {
        pending = undefined
      }
    })
    return withAbort(release, signal)
  }
}

/** Lazily refreshes changed source summaries and candidate membership independently of visible files. */
export const createNavigationIndex = (options: NavigationIndexOptions): NavigationIndex => {
  const graph = createDependencyGraph()
  const sources = new Map<string, IndexedSource>()
  const applySource = createSourceUpdater(sources, graph)
  const updateRelationships = createRelationshipUpdater(options.root, sources, graph)
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
  const stored = createStoredSources({
    graph,
    onRestore: (restored) => (configurations = restored),
    signal: lifetime.signal,
    sources,
    storage: options.storage,
  })
  const observeConfiguration = configurationObserver(
    stored.configure,
    options.onConfigurationChange,
  )
  const probe = async (): Promise<void> => {
    const checkpoints = indexCheckpoints(options.root, sources, directories, configurations)
    const changes = await readChangedPaths(checkpoints, lifetime.signal)
    generation += Number(changes.length > 0)
    changes.forEach((path) => dirty.add(relative(options.root, path).split(sep).join('/')))
    rescan ||= changes.some((path) => directories.has(path))
    reconfigure ||= changes.some((path) => configurations.has(path))
  }
  const refresh = async (): Promise<number> => {
    await stored.restore()
    await probe()
    const previous = revision
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
        }
        if (reset || revision === 1) {
          observeConfiguration(configurationKey(configurations), revision > 1)
        }
        const candidates = [...paths].filter(isAnalyzableFile)
        const updated: SourceChange[] = []
        // oxlint-disable-next-line no-await-in-loop -- Apply bounded source updates before resolving graph edges.
        for await (const {change, path, source} of readSourceUpdates({
          generation,
          paths: candidates,
          root: options.root,
          signal: lifetime.signal,
          sources,
        })) {
          updated.push(...(change === null ? [] : [change]))
          applySource(path, source, revision, entries)
        }
        options.onSourcesChange?.(updated)
        // File additions can make previously unresolved imports resolvable.
        const relationships = discover ? [...sources.keys()] : candidates
        updateRelationships(relationships, revision)
      }
    } while (dirty.size > 0 || rescan || reconfigure)
    if (revision !== previous) {
      await stored.persist(configurations)
    }
    return revision
  }
  return {
    candidates: graph.candidates,
    changed: graph.changed,
    checkpoint: checkpointReader(options, lifetime.signal, observeConfiguration),
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
    restore: stored.restore,
    scope: graph.scope,
    uncertain: (since) => broadRevision > since || graph.uncertain(since),
  }
}
