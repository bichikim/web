import {createSignal, onCleanup, onMount} from 'solid-js'

const MOBILE_LAYOUT_QUERY = '(width < 28rem)'

/** Reports the client viewport's Pomo mobile layout state after hydration. */
export const useMobileLayout = () => {
  const [isMobile, setIsMobile] = createSignal(false)

  onMount(() => {
    const mediaQuery = globalThis.matchMedia(MOBILE_LAYOUT_QUERY)
    const updateLayout = (event: MediaQueryListEvent) => setIsMobile(event.matches)

    setIsMobile(mediaQuery.matches)
    mediaQuery.addEventListener('change', updateLayout)
    onCleanup(() => mediaQuery.removeEventListener('change', updateLayout))
  })

  return isMobile
}
