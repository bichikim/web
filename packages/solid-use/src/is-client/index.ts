import {createSignal, onMount} from 'solid-js'

export const useIsClient = () => {
  // it can be used in client only environment
  const [isClient, setIsClient] = createSignal(!import.meta.env.SSR)

  onMount(() => {
    setIsClient(true)
  })

  return isClient
}
