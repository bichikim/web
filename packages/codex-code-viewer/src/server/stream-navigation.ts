import type {CodeLocation, NavigationResult} from '../shared/contracts'
import {readReferencePreviews} from './read-reference-previews'
import {resolveNavigation, type ResolveNavigationOptions} from './resolve-navigation'
import {streamProgress} from './stream-progress'

interface StreamNavigationOptions extends ResolveNavigationOptions {
  readonly signal: AbortSignal
}
const BATCH_SIZE = 512
const locationKey = ({path, line, column}: CodeLocation): string =>
  JSON.stringify([path, line, column])

/** Delivers verified discoveries during semantic search and supplements them through completion. */
export async function* streamNavigation(
  options: StreamNavigationOptions,
): AsyncGenerator<NavigationResult> {
  const locations = new Map<string, CodeLocation>()
  const counts = new Map<string, number>()
  const progress = streamProgress<NavigationResult>({
    run: async (receive, signal) => {
      const result = await resolveNavigation({
        ...options,
        previews: false,
        receive: (found) => {
          signal.throwIfAborted()
          return receive({kind: 'references', locations: [...found]})
        },
        receiveDefinitions: (found) => {
          if (found.length > 0) {
            return receive({kind: 'definition', locations: [...found]})
          }
        },
        signal,
      })
      signal.throwIfAborted()
      if (!result.ok) {
        throw new Error(result.error.code)
      }
      receive(result.value)
    },
    signal: options.signal,
  })
  let kind: NavigationResult['kind'] | undefined
  for await (const updates of progress) {
    const current = updates.at(-1)?.kind
    if (current !== kind) {
      locations.clear()
      counts.clear()
      kind = current
    }
    const active = updates.filter((update) => update.kind === current)
    if (kind === 'definition') {
      const found = active
        .flatMap((update) => update.locations)
        .filter((location) => {
          const key = locationKey(location)
          if (locations.has(key)) {
            return false
          }
          locations.set(key, location)
          return true
        })
      if (found.length > 0 || locations.size === 0) {
        yield {
          kind,
          locations:
            found.length > 1
              ? readReferencePreviews({
                  locations: found,
                  root: options.workspace.root,
                  sources: options.sources,
                })
              : found,
        }
      }
    } else {
      const found = active
        .flatMap((update) => update.locations)
        .filter((location) => {
          const key = locationKey(location)
          if (locations.has(key)) {
            return false
          }
          locations.set(key, location)
          counts.set(location.path, (counts.get(location.path) ?? 0) + 1)
          return true
        })
      if (found.length === 0) {
        if (locations.size === 0) {
          yield {kind: 'references', locations: []}
        }
      } else {
        yield {
          groups: [...counts].map(([path, count]) => ({count, path})),
          kind: 'references',
          locations: [],
        }
        const firstEnd = found.findIndex((location) => location.path !== found[0].path)
        const firstSize = Math.min(firstEnd < 0 ? found.length : firstEnd, BATCH_SIZE)
        let offset = 0
        while (offset < found.length) {
          options.signal.throwIfAborted()
          const size = offset === 0 ? firstSize : BATCH_SIZE
          yield {
            kind: 'references',
            locations: readReferencePreviews({
              locations: found.slice(offset, offset + size),
              root: options.workspace.root,
              sources: options.sources,
            }),
          }
          offset += size
        }
      }
    }
  }
}
