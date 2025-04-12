import {useEvent} from '@winter-love/solid-use'
import {createSignal} from 'solid-js'
import {getWindow, Size} from '@winter-love/utils'

export const useWindowSize = (initSize: Size) => {
  const [size, setSize] = createSignal<Size>({
    height: getWindow()?.innerHeight ?? initSize.height,
    width: getWindow()?.innerWidth ?? initSize.width,
  })

  useEvent(getWindow(), 'resize', (event: Event) => {
    const window = event.target as Window

    setSize({
      height: window.innerHeight,
      width: window.innerWidth,
    })
  })

  return size
}
