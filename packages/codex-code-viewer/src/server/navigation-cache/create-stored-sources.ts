import type {createDependencyGraph} from './create-dependency-graph'
import type {createSourceIndexStore} from './create-source-index-store'
import type {IndexedSource} from './types'

interface StoredSourcesOptions {
  readonly sources: Map<string, IndexedSource>
  readonly graph: ReturnType<typeof createDependencyGraph>
  readonly storage?: ReturnType<typeof createSourceIndexStore>
  readonly signal: AbortSignal
  readonly onRestore?: (configurations: ReadonlyMap<string, string | null>) => void
}
/** Restores a disposable index once and persists per-file summaries after completed refreshes. */
export const createStoredSources = (options: StoredSourcesOptions) => {
  let configuration: string | undefined
  let pending: Promise<void> | undefined
  return {
    configure: (current: string): void => {
      configuration = current
    },
    persist: async (configurations: ReadonlyMap<string, string | null>): Promise<void> => {
      if (options.storage === undefined) {
        return
      }
      const entries = options.graph.snapshot().flatMap(([path, file]) => {
        const source = options.sources.get(path)
        return source === undefined ? [] : [{file, path, source}]
      })
      await options.storage?.write(
        {
          configurations: [...configurations].sort(([left], [right]) => left.localeCompare(right)),
          entries,
        },
        options.signal,
      )
    },
    restore: (): Promise<void> => {
      if (pending !== undefined) {
        return pending
      }
      if (
        options.storage === undefined ||
        configuration === undefined ||
        options.sources.size > 0
      ) {
        return Promise.resolve(undefined)
      }
      pending = options.storage
        .read(options.signal)
        .then((snapshot) => {
          if (
            snapshot === undefined ||
            options.signal.aborted ||
            JSON.stringify(snapshot.configurations) !== configuration
          ) {
            return undefined
          }
          for (const entry of snapshot.entries) {
            options.sources.set(entry.path, entry.source)
            options.graph.update(entry.path, entry.file, 0)
          }
          options.onRestore?.(new Map(snapshot.configurations))
        })
        .catch(() => undefined)
      return pending
    },
  }
}
