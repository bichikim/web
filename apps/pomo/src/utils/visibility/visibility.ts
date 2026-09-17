import {getWindow} from '@winter-love/utils'

/** Reports document visibility changes with true for hidden and false for visible. */
export const visibility = (callback: (isHidden: boolean) => void) => {
  const target = getWindow()?.document
  const notifyVisibilityChange = (): void => {
    if (target === undefined) {
      return
    }

    callback(target.hidden)
  }
  target?.addEventListener('visibilitychange', notifyVisibilityChange)

  return () => {
    target?.removeEventListener('visibilitychange', notifyVisibilityChange)
  }
}
