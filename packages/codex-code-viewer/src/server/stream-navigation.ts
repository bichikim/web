import type {NavigationResult} from '../shared/contracts'
import {readReferencePreviews} from './read-reference-previews'
import {resolveNavigation, type ResolveNavigationOptions} from './resolve-navigation'

interface StreamNavigationOptions extends ResolveNavigationOptions {
  readonly signal: AbortSignal
}
const BATCH_SIZE = 512

/** Yields the first reference file early, followed by bounded batches of source previews. */
export async function* streamNavigation(
  options: StreamNavigationOptions,
): AsyncGenerator<NavigationResult> {
  options.signal.throwIfAborted()
  const result = await resolveNavigation({...options, previews: false})
  options.signal.throwIfAborted()
  if (!result.ok) {
    throw new Error(result.error.code)
  }
  if (result.value.kind === 'definition' || result.value.locations.length === 0) {
    yield {
      ...result.value,
      locations:
        result.value.locations.length > 1
          ? readReferencePreviews({
              locations: result.value.locations,
              root: options.workspace.root,
              sources: options.sources,
            })
          : result.value.locations,
    }
    return
  }
  const {locations} = result.value
  const firstPath = locations[0].path
  const firstEnd = locations.findIndex((location) => location.path !== firstPath)
  const firstSize = Math.min(firstEnd < 0 ? locations.length : firstEnd, BATCH_SIZE)
  let offset = 0
  while (offset < locations.length) {
    options.signal.throwIfAborted()
    const size = offset === 0 ? firstSize : BATCH_SIZE
    yield {
      kind: 'references',
      locations: readReferencePreviews({
        locations: locations.slice(offset, offset + size),
        root: options.workspace.root,
        sources: options.sources,
      }),
    }
    offset += size
  }
}
