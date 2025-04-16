import {MaybeAccessor, resolveAccessor, useEvent} from '@winter-love/solid-use'
import {createMemo, createSignal} from 'solid-js'
import {getWindow, Size} from '@winter-love/utils'

export const useWindowSize = (
  initSize: Size,
  active?: MaybeAccessor<boolean | undefined>,
) => {
  const activeAccessor = resolveAccessor(active)

  const [size, setSize] = createSignal<Size>({
    height: getWindow()?.innerHeight ?? initSize.height,
    width: getWindow()?.innerWidth ?? initSize.width,
  })

  const globalTarget = createMemo(() => {
    return activeAccessor() ? getWindow() : null
  })

  useEvent(globalTarget, 'resize', (event: Event) => {
    const window = event.target as Window

    setSize({
      height: window.innerHeight,
      width: window.innerWidth,
    })
  })

  return size
}
