import {getWindow} from '@winter-love/utils'
import {Accessor, createMemo} from 'solid-js'

export const useTargetElement = (target: Accessor<HTMLElement | string | null>): Accessor<HTMLElement | null> => {
  return createMemo((): HTMLElement | null => {
    const targetValue = target()
    const window = getWindow()

    if (typeof targetValue === 'string') {
      if (window) {
        return window.document.querySelector(targetValue)
      }

      return null
    }

    return targetValue
  })
}
