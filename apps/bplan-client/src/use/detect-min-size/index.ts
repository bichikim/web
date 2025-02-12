import {Accessor, createEffect, createSignal} from 'solid-js'
import {useEvent} from '@winter-love/solid-use'
import {getWindow, HUNDRED} from '@winter-love/utils'

const minScreenWidth = 375

const getMinScale = (pianoSize?: number, defaultSize: number = HUNDRED) => {
  return (
    ((getWindow()?.innerWidth ?? minScreenWidth) / (pianoSize ?? defaultSize)) * HUNDRED
  )
}

export const useDetectMinScale = (
  element: Accessor<HTMLElement | null>,
  defaultSize: number = HUNDRED,
) => {
  const [size, setSize] = createSignal(getMinScale(element()?.clientWidth, defaultSize))

  useEvent(getWindow, 'resize', () => {
    setSize(getMinScale(element()?.clientWidth))
  })

  createEffect(() => {
    setSize(getMinScale(element()?.clientWidth))
  })

  return size
}
