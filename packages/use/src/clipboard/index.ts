import {MayRef} from 'src/types'
import {wrapRef} from 'src/wrap-ref'
import {freeze, isSSR} from '@winter-love/utils'
import {useElementEvent} from '../element-event'
import {ref} from 'vue'

const isClipboardAble = () => {
  if (isSSR()) {
    return false
  }

  const {navigator} = window

  return Boolean(navigator && navigator.clipboard)
}

export type ClipboardState = 'idle' | 'reading' | 'writing'

export const useClipboard = (
  initState?: MayRef<string | undefined>,
) => {
  const valueRef = wrapRef(initState)
  const isSupported = isClipboardAble()
  const stateRef = ref('idle')

  const paste = () => {
    if (!isSupported) {
      return
    }

    stateRef.value = 'reading'
    return navigator.clipboard.readText().then((value) => {
      valueRef.value = value
      stateRef.value = 'idle'
      return value
    })
  }

  if (isSupported) {
    useElementEvent(window, 'copy' as any, paste)
    useElementEvent(window, 'cut' as any, paste)
  }

  const copy = (_value?: string) => {
    const {value} = valueRef
    if (isSupported && value) {
      stateRef.value = 'writing'
      return navigator.clipboard.writeText(_value ?? value).then(() => {
        stateRef.value = 'idle'
        paste()
      })
    }
  }

  paste()

  return freeze({
    copy,
    isSupported,
    paste,
    state: stateRef,
    value: valueRef,
  })
}
