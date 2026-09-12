import {getWindow} from '@winter-love/utils'

/** Reports document visibility changes with true for hidden and false for visible. */
export const visibility = (callback: (isHidden: boolean) => void) => {
  const notifyVisibilityChange = (): void => {
    callback(document.hidden)
  }
  getWindow()?.addEventListener('visibilitychange', notifyVisibilityChange)

  return () => {
    getWindow()?.removeEventListener('visibilitychange', notifyVisibilityChange)
  }
}
