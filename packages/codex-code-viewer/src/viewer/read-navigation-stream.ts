import {
  type NavigationLocation,
  type NavigationResult,
  navigationResultSchema,
} from '../shared/contracts'
import {nextAnimationFrame} from './next-animation-frame'
import {readJsonStream} from './read-json-stream'
import type {ViewerPort} from './types'

interface NavigationStreamOptions {
  readonly call?: ViewerPort['call']
  readonly url: string
  readonly signal: AbortSignal
  readonly receiveDefinitions?: (locations: readonly NavigationLocation[]) => void
  readonly receive: (
    locations: readonly NavigationLocation[],
    groups?: NavigationResult['groups'],
  ) => void
}

/** Publishes discoveries once per frame and retains definition candidates until navigation completes. */
export const readNavigationStream = async (
  options: NavigationStreamOptions,
): Promise<NavigationResult | null> => {
  const definitions = new Map<string, NavigationLocation>()
  const state: {kind: NavigationResult['kind']} = {kind: 'references'}
  const pending: NavigationResult[] = []
  let frame: Promise<void> | undefined
  let failure: Error | undefined
  const flush = (): void => {
    const updates = pending.splice(0)
    const current = updates.at(-1)?.kind
    const active = updates.filter((update) => update.kind === current)
    const locations = active.flatMap((update) => update.locations)
    if (current === 'definition') {
      options.receiveDefinitions?.(locations)
    } else {
      const groups = active.findLast((update) => update.groups !== undefined)?.groups
      options.receive(locations, groups)
    }
  }
  try {
    await readJsonStream({
      call: options.call,
      receive: (batch) => {
        if (state.kind !== batch.kind) {
          definitions.clear()
          state.kind = batch.kind
        }
        if (batch.kind === 'definition') {
          batch.locations.forEach((location) =>
            definitions.set(
              JSON.stringify([location.path, location.line, location.column]),
              location,
            ),
          )
        }
        pending.push(batch)
        if (frame === undefined) {
          frame = nextAnimationFrame(options.signal)
            .then(() => {
              options.signal.throwIfAborted()
              flush()
              frame = undefined
            })
            .catch((error: unknown) => {
              failure =
                error instanceof Error ? error : new Error('Navigation failed', {cause: error})
            })
        }
      },
      schema: navigationResultSchema,
      signal: options.signal,
      url: options.url,
    })
  } finally {
    await frame
  }
  options.signal.throwIfAborted()
  if (failure instanceof Error) {
    // oxlint-disable-next-line no-throw-literal -- The producer failure is normalized to an Error before storage.
    throw failure
  }
  return state.kind === 'definition'
    ? {kind: state.kind, locations: [...definitions.values()]}
    : null
}
