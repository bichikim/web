import {getWindow} from '@winter-love/utils'

const offListener = (event: MouseEvent) => {
  event.preventDefault()
  event.stopPropagation()
}

/**
 * @experimental
 */
export const createDisableContextMenu = () => {
  return (off: boolean) => {
    if (off) {
      getWindow()?.addEventListener('contextmenu', offListener)
    } else {
      getWindow()?.removeEventListener('contextmenu', offListener)
    }
  }
}
