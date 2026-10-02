import {type Accessor, createSignal, onCleanup, onMount} from 'solid-js'

export interface MediaQueryOptions {
  readonly initialValue?: boolean
}

/** Observes a fixed media query after mounting; retains initialValue (default false) before mount or without matchMedia. */
export const useMediaQuery = (
  query: string,
  options: MediaQueryOptions = {},
): Accessor<boolean> => {
  const [matches, setMatches] = createSignal(options.initialValue ?? false)

  onMount(() => {
    if (typeof globalThis.matchMedia !== 'function') {
      return
    }

    const mediaQuery = globalThis.matchMedia(query)
    const handleChange = (event: MediaQueryListEvent) => setMatches(event.matches)

    setMatches(mediaQuery.matches)
    mediaQuery.addEventListener('change', handleChange)
    onCleanup(() => mediaQuery.removeEventListener('change', handleChange))
  })

  return matches
}
