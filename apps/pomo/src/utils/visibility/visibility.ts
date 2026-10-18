import {getWindow} from '@winter-love/utils'

/** 문서의 표시 상태가 바뀌면 숨김은 true, 표시는 false로 알린다. */
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
