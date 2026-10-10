import {type NavigationLocation, type NavigationResult, navigationSchema} from '../shared/contracts'
import {nextAnimationFrame} from './next-animation-frame'
import {readJsonStream} from './read-json-stream'

interface NavigationStreamOptions {
  readonly url: string
  readonly signal: AbortSignal
  readonly receive: (locations: readonly NavigationLocation[]) => void
}

/** Delivers reference batches between rendering opportunities and returns definition destinations. */
export const readNavigationStream = async (
  options: NavigationStreamOptions,
): Promise<NavigationResult | null> => {
  const definitions: NavigationResult[] = []
  await readJsonStream({
    receive: async (batch) => {
      if (batch.kind === 'definition') {
        definitions.push(batch)
        return
      }
      options.receive(batch.locations)
      await nextAnimationFrame(options.signal)
    },
    schema: navigationSchema.required(),
    signal: options.signal,
    url: options.url,
  })
  return definitions[0] ?? null
}
