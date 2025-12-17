import {createSignal, onMount} from 'solid-js'

/**
 * @deprecated use isServer from solid-js/web or clientOnly from @solidjs/start
 * @returns
 */
export const useIsClient = () => {
  // it can be used in client only environment
  const [isClient, setIsClient] = createSignal(!import.meta.env.SSR)

  onMount(() => {
    setIsClient(true)
  })

  return isClient
}
