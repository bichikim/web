import {createSignal, onCleanup} from 'solid-js'

export const useIsCleanup = () => {
  const [isCleanup, setIsCleanup] = createSignal(false)

  onCleanup(() => {
    setIsCleanup(true)
  })

  return isCleanup
}
