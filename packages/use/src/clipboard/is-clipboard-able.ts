import {isSSR} from '@winter-love/utils'

export const isClipboardAble = () => {
  if (isSSR()) {
    return false
  }

  const {navigator} = window

  return Boolean(navigator && navigator.clipboard)
}
