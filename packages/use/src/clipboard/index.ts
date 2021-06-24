import {MayRef} from 'src/types'
import {wrapRef} from 'src/wrap-ref'
import {freeze, isSSR} from '@winter-love/utils'
import {useElementEvent} from '../element-event'

const isClipboardAble = () => {
  if (isSSR()) {
    return false
  }

  const {navigator} = window

  return Boolean(navigator && navigator.clipboard)
}

export const useClipboard = (
  initState?: MayRef<string | undefined>,
) => {
  const valueRef = wrapRef(initState)
  const isSupported = isClipboardAble()

  const paste = () => {
    if (!isSupported) {
      return
    }

    return navigator.clipboard.readText().then((value) => {
      valueRef.value = value
      return value
    })
  }

  if (isSupported) {
    useElementEvent(window, 'copy' as any, paste)
    useElementEvent(window, 'cut' as any, paste)
  }

  const copy = () => {
    const {value} = valueRef
    if (isSupported && value) {
      return navigator.clipboard.writeText(value)
    }
  }

  return freeze({
    copy,
    isSupported,
    paste,
    value: valueRef,
  })
}
