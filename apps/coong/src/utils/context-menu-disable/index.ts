import {getWindow} from '@winter-love/utils'

const offListener = (event: MouseEvent) => {
  event.preventDefault()
  event.stopPropagation()
}

export const OFF_CONTEXT_MENU_FLAG = Symbol('off-context-menu-flag')

/**
 * add a flag to the window object to check if the context menu is disabled
 */
declare global {
  interface Window {
    [OFF_CONTEXT_MENU_FLAG]?: boolean
  }
}

/**
 * context menu disable function
 * it won't disable the context menu if the flag is already set
 * @experimental
 */
export const createContextMenuDisable = () => {
  return (off: boolean) => {
    const window = getWindow()

    if (!window) {
      return
    }

    if (off) {
      window[OFF_CONTEXT_MENU_FLAG] || getWindow()?.addEventListener('contextmenu', offListener)
      window[OFF_CONTEXT_MENU_FLAG] = true
    } else {
      window[OFF_CONTEXT_MENU_FLAG] && getWindow()?.removeEventListener('contextmenu', offListener)
      window[OFF_CONTEXT_MENU_FLAG] = false
    }
  }
}
