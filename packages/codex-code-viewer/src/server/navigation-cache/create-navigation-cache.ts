import {createHash} from 'node:crypto'
import * as path from 'node:path'
import type {
  CodeDocument,
  NavigationInput,
  NavigationLocation,
  NavigationResult,
  Result,
} from '../../shared/contracts'
import {createBoundedCache} from '../../shared/create-bounded-cache'
import {tokenizeDocument} from '../tokenize-document'
import type {NavigationIndex, NavigationReview} from './types'

interface CachedNavigation {
  readonly kind: NavigationResult['kind']
  readonly groups: ReadonlyMap<string, readonly NavigationLocation[]>
  readonly dependencies: ReadonlySet<string>
  readonly verifiedAt: number
}
interface NavigationCacheOptions {
  readonly index: NavigationIndex
  readonly read: (path: string) => Result<CodeDocument>
  readonly scan: (
    input: NavigationInput,
    signal: AbortSignal,
    review?: NavigationReview,
  ) => AsyncIterable<NavigationResult>
  readonly maxEntries?: number
  readonly maxBytes?: number
}
interface NavigationQuery {
  readonly key: string
  readonly name: string
  readonly drafted: boolean
}
const BATCH_SIZE = 512
const MAX_ENTRIES = 32
const MAX_BYTES = 16777216
const indexedPath = (file: string): string => file.split(path.sep).join('/')
const readNavigationQuery = (
  input: NavigationInput,
  read: NavigationCacheOptions['read'],
): NavigationQuery => {
  const result = read(input.path)
  if (!result.ok) {
    throw new Error(result.error.code)
  }
  const {value: document} = result
  if (document.revision !== input.revision) {
    throw new Error('stale-document')
  }
  const sources = [...(input.sources ?? [])].sort((left, right) =>
    left.path.localeCompare(right.path),
  )
  const key = createHash('sha256')
    .update(JSON.stringify([input.path, input.offset, input.navigation, input.revision, sources]))
    .digest('hex')
  const draft = sources.find((source) => source.path === input.path)
  const lines = draft === undefined ? document.lines : tokenizeDocument(input.path, draft.source)
  const name =
    lines
      .flat()
      .find(
        (token) => token.offset <= input.offset && input.offset < token.offset + token.text.length,
      )?.text ?? ''
  return {drafted: sources.length > 0, key, name}
}
const reviewNavigation = (
  index: NavigationIndex,
  previous: CachedNavigation,
  dependencies: ReadonlySet<string>,
  broad: boolean,
) => {
  const affected = index.changed(
    new Set([...previous.dependencies, ...dependencies]),
    previous.verifiedAt,
  )
  return {
    files: broad ? undefined : [...affected],
    hit: !broad && affected.size === 0,
    retained: new Map(
      previous.kind === 'references' && !broad
        ? [...previous.groups].filter(([path]) => !affected.has(path))
        : [],
    ),
  }
}
const sameLocations = (
  before: readonly NavigationLocation[],
  after: readonly NavigationLocation[],
): boolean =>
  before.length === after.length &&
  before.every((location, index) => {
    const next = after[index]
    return (
      location.path === next.path &&
      location.line === next.line &&
      location.column === next.column &&
      location.preview === next.preview
    )
  })

function* batches(
  kind: NavigationResult['kind'],
  groups: ReadonlyMap<string, readonly NavigationLocation[]>,
): Generator<NavigationResult> {
  if (kind === 'definition') {
    yield {kind, locations: [...groups.values()].flat()}
    return
  }
  let locations: NavigationLocation[] = []
  for (const group of groups.values()) {
    for (const location of group) {
      locations.push(location)
      if (locations.length === BATCH_SIZE) {
        yield {kind, locations}
        locations = []
      }
    }
  }
  if (locations.length > 0 || groups.size === 0) {
    yield {kind, locations}
  }
}

/** Retains file groups and lazily validates candidate membership before replaying completed queries. */
export const createNavigationCache = (options: NavigationCacheOptions) => {
  const cache = createBoundedCache<CachedNavigation>({
    maxEntries: options.maxEntries ?? MAX_ENTRIES,
    maxWeight: options.maxBytes ?? MAX_BYTES,
    weight: (entry) =>
      JSON.stringify([...entry.groups]).length * 2 +
      [...entry.dependencies].reduce((sum, path) => sum + path.length * 2, 0),
  })
  return {
    dispose: () => {
      cache.clear()
      options.index.dispose()
    },
    scan: async function* (
      input: NavigationInput,
      signal: AbortSignal,
    ): AsyncGenerator<NavigationResult> {
      signal.throwIfAborted()
      const query = readNavigationQuery(input, options.read)
      const revision = await options.index.refresh(signal)
      const generation = options.index.generation()
      const previous = cache.get(query.key)
      if (previous?.verifiedAt === revision) {
        for (const batch of batches(previous.kind, previous.groups)) {
          signal.throwIfAborted()
          yield batch
        }
        return
      }
      const dependencies = options.index.scope(
        [indexedPath(input.path), ...(previous?.groups.keys() ?? [])],
        query.name,
      )
      const broad =
        previous !== undefined && (options.index.uncertain(previous.verifiedAt) || query.drafted)
      const review =
        previous === undefined
          ? {
              files: undefined,
              hit: false,
              retained: new Map<string, readonly NavigationLocation[]>(),
            }
          : reviewNavigation(options.index, previous, dependencies, broad)
      if (previous !== undefined && review.hit) {
        cache.set(query.key, {...previous, dependencies, verifiedAt: revision})
        for (const batch of batches(previous.kind, previous.groups)) {
          signal.throwIfAborted()
          yield batch
        }
        return
      }
      const {retained} = review
      if (retained.size > 0) {
        for (const batch of batches('references', retained)) {
          signal.throwIfAborted()
          yield batch
        }
      }
      const locations: NavigationLocation[] = [...retained.values()].flat()
      let kind: NavigationResult['kind'] = 'references'
      for await (const batch of options.scan(input, signal, {
        files: review.files,
        retained: [...retained.keys()],
      })) {
        signal.throwIfAborted()
        const {kind: resultKind, locations: found} = batch
        kind = resultKind
        const updated = found.filter((location) => !retained.has(indexedPath(location.path)))
        locations.push(...updated)
        if (updated.length > 0 || (locations.length === 0 && retained.size === 0)) {
          yield {...batch, locations: updated}
        }
      }
      signal.throwIfAborted()
      const verified = await options.index.refresh(signal)
      if (verified === revision && options.index.generation() === generation) {
        const groups = new Map(
          [...Map.groupBy(locations, (location) => indexedPath(location.path))].map(
            ([path, current]) => {
              const before = previous?.groups.get(path)
              return [
                path,
                before !== undefined && sameLocations(before, current) ? before : current,
              ] as const
            },
          ),
        )
        cache.set(query.key, {
          dependencies: options.index.scope(
            [indexedPath(input.path), ...groups.keys()],
            query.name,
          ),
          groups,
          kind,
          verifiedAt: revision,
        })
      }
    },
  }
}
