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
    // #2844: Vitest 브라우저 모드로 확인했고 matches 누락은 재현되지 않음.
    // Chromium 147·Firefox 148·WebKit 26.4의 화면 폭·색상 테마 변경에서 확인했다.
    // matches 없는 합성 Event만으로 폴백을 요구하지 않고, 실제 지원 환경의 재현을 먼저 확인한다.
    const handleChange = (event: MediaQueryListEvent) => setMatches(event.matches)

    setMatches(mediaQuery.matches)
    mediaQuery.addEventListener('change', handleChange)
    onCleanup(() => mediaQuery.removeEventListener('change', handleChange))
  })

  return matches
}
