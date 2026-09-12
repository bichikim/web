import {getWindow} from '@winter-love/utils'

export const visibility = (callback: (isVisible: boolean) => void) => {
  const notifyIfHidden = (): void => {
    callback(document.hidden)
  }
  getWindow()?.addEventListener('visibilitychange', notifyIfHidden)

  return () => {
    getWindow()?.removeEventListener('visibilitychange', notifyIfHidden)
  }
}
