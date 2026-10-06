import {subscribeEvent} from 'src/utils/subscribe-event'

export interface ObserveMediaQueryOptions {
  readonly matchMedia?: (query: string) => MediaQueryList
  readonly notifyInitial?: boolean
}

/** Observes media matches and returns the subscription disposer; unavailable capability returns null. */
export const observeMediaQuery = (
  query: string,
  onChange: (matches: boolean) => void,
  options: ObserveMediaQueryOptions = {},
): (() => void) | null => {
  const matchMedia = options.matchMedia ?? globalThis.matchMedia?.bind(globalThis)
  if (matchMedia === undefined) {
    return null
  }
  const media = matchMedia(query)
  const handleChange = (event: Event) =>
    onChange(
      'matches' in event && typeof event.matches === 'boolean' ? event.matches : media.matches,
    )
  const unsubscribe = subscribeEvent(media, 'change', handleChange)
  if (options.notifyInitial !== false) {
    onChange(media.matches)
  }
  return unsubscribe
}

export const observeReducedMotionPreference = (
  onChange: (matches: boolean) => void,
  options?: ObserveMediaQueryOptions,
) => observeMediaQuery('(prefers-reduced-motion: reduce)', onChange, options)
