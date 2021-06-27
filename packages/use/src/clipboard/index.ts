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

  const read = () => {
    if (!isSupported || stateRef.value !== 'idle') {
      return valueRef.value
    }

    stateRef.value = 'reading'
    return navigator.clipboard.readText().then((value) => {
      valueRef.value = value
      stateRef.value = 'idle'
      return value
    })
  }

  if (isSupported) {
    useElementEvent(window, 'copy' as any, read)
    useElementEvent(window, 'cut' as any, read)
  }

  const write = (_value?: string) => {
    if (!isSupported || stateRef.value !== 'idle') {
      return valueRef.value
    }
    const {value} = valueRef
    if (value) {
      stateRef.value = 'writing'
      return navigator.clipboard.writeText(_value ?? value).then(() => {
        stateRef.value = 'idle'
        read()
      })
    }
  }

  read()

  return freeze({
    isSupported,
    read,
    state: stateRef,
    value: valueRef,
    write,
  })
}
