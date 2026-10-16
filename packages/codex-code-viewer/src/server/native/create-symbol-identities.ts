import type {createNativeClient} from './create-native-client'
import type {createWorkspaceLinks} from './create-workspace-links'
import type {NativeLocation, SourcePoint} from './types'
import {createQueryPool} from './create-query-pool'

export const locationKey = ({path, line, column}: NativeLocation): string =>
  JSON.stringify([path, line, column])

const silent = (): void => undefined

/** Resolves declaration origins and memoizes verified symbol identities for one metadata epoch. */
export const createSymbolIdentities = (
  workspace: Pick<ReturnType<typeof createWorkspaceLinks>, 'point' | 'location' | 'origins'>,
  client: Pick<ReturnType<typeof createNativeClient>, 'query'>,
  cache: Map<string, readonly NativeLocation[]>,
  concurrency = 2,
) => {
  const schedule = createQueryPool(concurrency)
  const pending = new Map<string, Promise<readonly NativeLocation[]>>()
  const requests = new Map<string, Promise<NativeLocation[]>>()
  const completed = new Map<string, NativeLocation[]>()
  let started = 0
  let shared = 0
  let retained = 0
  let rawRetained = 0
  let active = 0
  let peak = 0
  const definition = (
    point: SourcePoint,
    document: 'open' | 'disk' = 'open',
    phase: 'initial' | 'prepared' = 'initial',
  ) => {
    const key = JSON.stringify([point.file, point.offset, point.source, document])
    const cached = phase === 'prepared' ? completed.get(key) : undefined
    if (cached !== undefined) {
      rawRetained += 1
      return Promise.resolve(cached)
    }
    const existing = requests.get(key)
    if (existing !== undefined) {
      shared += 1
      return existing
    }
    const request = schedule(async () => {
      started += 1
      active += 1
      peak = Math.max(peak, active)
      try {
        const result = await client.query({...point, document, kind: 'definition', receive: silent})
        if (phase === 'prepared') {
          completed.set(key, result)
        }
        return result
      } finally {
        active -= 1
      }
    }).finally(() => requests.delete(key))
    requests.set(key, request)
    return request
  }
  const canonicalize = async (
    locations: readonly NativeLocation[],
    seen = new Set<string>(),
    phase: 'initial' | 'prepared' = 'initial',
  ): Promise<NativeLocation[]> => {
    const batches = await Promise.all(
      locations.map(async (location) => {
        const point = workspace.point(location)
        if (point === undefined) {
          return []
        }
        const normalized = workspace.location(point)
        const key = locationKey(normalized)
        if (seen.has(key)) {
          return []
        }
        seen.add(key)
        const origins = workspace.origins(point)
        if (origins === undefined || origins.length === 0) {
          return [normalized]
        }
        const definitions = await Promise.all(
          origins.map((origin) => definition(origin, 'open', phase)),
        )
        const resolved = definitions.flat()
        if (resolved.every((target) => locationKey(target) === key)) {
          return [normalized]
        }
        return canonicalize(resolved, seen, phase)
      }),
    )
    return batches.flat()
  }
  return {
    canonicalize,
    read: (point: SourcePoint): Promise<readonly NativeLocation[]> => {
      const key = JSON.stringify([point.file, point.offset, point.source])
      const cached = cache.get(key)
      if (cached !== undefined) {
        retained += 1
        return Promise.resolve(cached)
      }
      const existing = pending.get(key)
      if (existing !== undefined) {
        shared += 1
        return existing
      }
      const request = (async () => {
        // Keep symbol checks in the prepared project without creating another editor overlay.
        const result = await canonicalize(
          await definition(point, 'disk', 'prepared'),
          new Set(),
          'prepared',
        )
        cache.set(key, result)
        return result
      })().finally(() => pending.delete(key))
      pending.set(key, request)
      return request
    },
    statistics: () => ({peak, rawRetained, retained, shared, started}),
  }
}
