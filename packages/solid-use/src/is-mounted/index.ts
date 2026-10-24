import {createSignal, onMount} from 'solid-js'

export const useIsMounted = () => {
  const [mounted, setMounted] = createSignal(false)

  onMount(() => {
    setMounted(true)
  })

  return mounted
}
