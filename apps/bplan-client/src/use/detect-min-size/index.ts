import {Accessor, createEffect, createSignal} from 'solid-js'
import {useEvent} from '@winter-love/solid-use'
import {getWindow} from '@winter-love/utils'

const minScreenWidth = 375

const getMinScale = (pianoSize?: number) => {
  return (getWindow()?.innerWidth ?? minScreenWidth) / (pianoSize ?? 1)
}

export const useDetectMinScale = (element: Accessor<HTMLElement | null>) => {
  const [size, setSize] = createSignal(getMinScale(element()?.clientWidth))

  useEvent(getWindow, 'resize', () => {
    setSize(getMinScale(element()?.clientWidth))
  })

  createEffect(() => {
    setSize(getMinScale(element()?.clientWidth))
  })

  return size
}
