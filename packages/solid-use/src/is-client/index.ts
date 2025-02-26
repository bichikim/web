import {createSignal, onMount} from 'solid-js'

export const useIsClient = () => {
  // it can be used in client only environment
  const [isClient, setIsClient] = createSignal(false)

  onMount(() => {
    setIsClient(true)
  })

  return isClient
}
