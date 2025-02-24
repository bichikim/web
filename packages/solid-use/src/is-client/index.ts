import {createSignal, onMount} from 'solid-js'
import {getWindow} from '@winter-love/utils'

export const useIsClient = () => {
  // it can be used in client only environment
  const [isClient, setIsClient] = createSignal(Boolean(getWindow()))

  onMount(() => {
    // only mount can start in client
    setIsClient(true)
  })

  return isClient
}
