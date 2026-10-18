import {createHash} from 'node:crypto'
import * as path from 'node:path'
import type {
  CodeDocument,
  NavigationInput,
  NavigationLocation,
  NavigationResult,
  Result,
} from '../../shared/contracts'
import {fileFormat} from '../../shared/file-formats'
import {createBoundedCache} from '../../shared/create-bounded-cache'
import {tokenizeDocument} from '../tokenize-document'
import type {NavigationCheckpoint, NavigationIndex, NavigationReview} from './types'

interface CachedNavigation {
  readonly checkpoint?: NavigationCheckpoint
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
  readonly semanticInputs?: () => ReadonlyMap<string, string>
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
  const draft = sources.find((source) => source.path === input.path)
  const lines = draft === undefined ? document.lines : tokenizeDocument(input.path, draft.source)
  const token = lines
    .flat()
    .find(
      (token) => token.offset <= input.offset && input.offset < token.offset + token.text.length,
    )
  const offset =
    input.navigation === 'definition' && token?.kind === 'identifier' ? token.offset : input.offset
  const key = createHash('sha256')
    .update(JSON.stringify([input.path, offset, input.navigation, input.revision, sources]))
    .digest('hex')
  return {drafted: sources.length > 0, key, name: token?.text ?? ''}
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
const prepareReview = (
  index: NavigationIndex,
  input: NavigationInput,
  query: NavigationQuery,
  previous: CachedNavigation | undefined,
) => {
  const dependencies = index.scope(
    [indexedPath(input.path), ...(previous?.groups.keys() ?? [])],
    query.name,
  )
  const broad = previous !== undefined && (index.uncertain(previous.verifiedAt) || query.drafted)
  const review =
    previous === undefined
      ? {files: undefined, hit: false, retained: new Map<string, readonly NavigationLocation[]>()}
      : reviewNavigation(index, previous, dependencies, broad)
  return {dependencies, ...review}
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

const readCacheEntry = async (
  previous: CachedNavigation | undefined,
  signal: AbortSignal,
): Promise<CachedNavigation | undefined> =>
  previous?.checkpoint !== undefined && !(await previous.checkpoint.unchanged(signal))
    ? undefined
    : previous

const refreshCacheEntry = async (
  index: NavigationIndex,
  previous: CachedNavigation | undefined,
  signal: AbortSignal,
): Promise<number> =>
  previous === undefined || previous.checkpoint !== undefined ? 0 : index.refresh(signal)

const prepareNavigationIndex = (
  index: NavigationIndex,
  signal: AbortSignal,
  path: string,
  complete: boolean,
) => {
  const metadataOnly = complete || fileFormat(path)?.kind === 'syntax'
  let pending: Promise<PromiseSettledResult<number>> | undefined
  return {
    metadataOnly,
    result: () => pending,
    start: ({kind, locations}: Pick<NavigationResult, 'kind' | 'locations'>): void => {
      if (!metadataOnly && kind === 'references' && locations.length > 0) {
        // Retain rejection as data when a cancelled stream stops consuming its verification.
        pending ??= index.refresh(signal).then(
          (value) => ({status: 'fulfilled' as const, value}),
          (reason) => ({reason, status: 'rejected' as const}),
        )
      }
    },
  }
}
interface NavigationVerification {
  readonly prepared?: Promise<PromiseSettledResult<number>>
  readonly metadataOnly: boolean
  readonly kind: NavigationResult['kind']
  readonly index: NavigationIndex
  readonly checkpoint: NavigationCheckpoint | undefined
  readonly revision: number
  readonly signal: AbortSignal
}
const verifyNavigation = async (options: NavigationVerification): Promise<number | null> => {
  if ((options.metadataOnly || options.kind === 'definition') && options.checkpoint !== undefined) {
    return (await options.checkpoint.unchanged(options.signal)) ? 0 : null
  }
  const prepared = await options.prepared
  if (prepared?.status === 'rejected') {
    throw prepared.reason
  }
  // A cold checkpoint verifies the final filesystem state. Incremental scans still need a final probe.
  const verified =
    options.checkpoint !== undefined && prepared !== undefined
      ? prepared.value
      : await options.index.refresh(options.signal)
  const unchanged =
    options.checkpoint === undefined
      ? verified === options.revision
      : await options.checkpoint.unchanged(options.signal)
  return unchanged ? verified : null
}
const retainedCheckpoint = (
  kind: NavigationResult['kind'],
  checkpoint: NavigationCheckpoint | undefined,
  metadataOnly: boolean,
) => (metadataOnly || kind === 'definition' ? checkpoint : undefined)

const groupLocations = (
  locations: readonly NavigationLocation[],
  previous: CachedNavigation | undefined,
) =>
  new Map(
    [...Map.groupBy(locations, (location) => indexedPath(location.path))].map(([path, current]) => {
      const before = previous?.groups.get(path)
      return [
        path,
        before !== undefined && sameLocations(before, current) ? before : current,
      ] as const
    }),
  )

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

const prepareQuery = async (
  options: NavigationCacheOptions,
  input: NavigationInput,
  previous: CachedNavigation | undefined,
  signal: AbortSignal,
) => {
  const checkpoint = previous === undefined ? await options.index.checkpoint(signal) : undefined
  const revision = await refreshCacheEntry(options.index, previous, signal)
  return {
    checkpoint,
    complete: options.semanticInputs !== undefined && fileFormat(input.path)?.kind === 'code',
    generation: options.index.generation(),
    revision,
  }
}
const includeSemanticInputs = (
  checkpoint: NavigationCheckpoint | undefined,
  options: NavigationCacheOptions,
  input: NavigationInput,
): NavigationCheckpoint | undefined =>
  options.semanticInputs !== undefined && fileFormat(input.path)?.kind === 'code'
    ? (checkpoint?.include?.(options.semanticInputs()) ?? checkpoint)
    : checkpoint

/** Retains file groups and lazily validates candidate membership before replaying completed queries. */
export const createNavigationCache = (options: NavigationCacheOptions) => {
  const cache = createBoundedCache<CachedNavigation>({
    maxEntries: options.maxEntries ?? MAX_ENTRIES,
    maxWeight: options.maxBytes ?? MAX_BYTES,
    weight: (entry) =>
      (entry.checkpoint?.bytes ?? 0) +
      JSON.stringify([...entry.groups]).length * 2 +
      [...entry.dependencies].reduce((sum, path) => sum + path.length * 2, 0),
  })
  return {
    clear: () => cache.clear(),
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
      const previous = await readCacheEntry(cache.get(query.key), signal)
      const {checkpoint, complete, generation, revision} = await prepareQuery(
        options,
        input,
        previous,
        signal,
      )
      if (previous !== undefined && previous.verifiedAt === revision) {
        for (const batch of batches(previous.kind, previous.groups)) {
          signal.throwIfAborted()
          yield batch
        }
        return
      }
      const review = prepareReview(options.index, input, query, previous)
      if (previous !== undefined && review.hit) {
        cache.set(query.key, {...previous, dependencies: review.dependencies, verifiedAt: revision})
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
      const preparation = prepareNavigationIndex(options.index, signal, input.path, complete)
      let kind: NavigationResult['kind'] = 'references'
      for await (const batch of options.scan(input, signal, {
        candidates: complete
          ? undefined
          : options.index.candidates?.([indexedPath(input.path)], query.name),
        discovery: checkpoint?.discovery,
        files: review.files,
        retained: [...retained.keys()],
      })) {
        signal.throwIfAborted()
        const {kind: resultKind, locations: found} = batch
        kind = resultKind
        const updated = found.filter((location) => !retained.has(indexedPath(location.path)))
        locations.push(...updated)
        if (
          batch.groups !== undefined ||
          updated.length > 0 ||
          (locations.length === 0 && retained.size === 0)
        ) {
          yield {
            ...batch,
            ...(batch.groups === undefined
              ? {}
              : {
                  groups: [
                    ...[...retained].map(([path, group]) => ({
                      count: group.length,
                      path: group[0]?.path ?? path,
                    })),
                    ...batch.groups.filter((group) => !retained.has(indexedPath(group.path))),
                  ],
                }),
            locations: updated,
          }
          preparation.start({kind, locations: updated})
        }
      }
      signal.throwIfAborted()
      const verifiedCheckpoint = includeSemanticInputs(checkpoint, options, input)
      const verified = await verifyNavigation({
        checkpoint: verifiedCheckpoint,
        index: options.index,
        kind,
        metadataOnly: preparation.metadataOnly,
        prepared: preparation.result(),
        revision,
        signal,
      })
      if (verified !== null && options.index.generation() === generation) {
        const groups = groupLocations(locations, previous)
        cache.set(query.key, {
          checkpoint: retainedCheckpoint(kind, verifiedCheckpoint, preparation.metadataOnly),
          dependencies: options.index.scope(
            [indexedPath(input.path), ...groups.keys()],
            query.name,
          ),
          groups,
          kind,
          verifiedAt: verified,
        })
      }
    },
  }
}
