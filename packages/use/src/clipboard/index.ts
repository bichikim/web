import {freeze} from '@winter-love/utils'
import {useElementEvent} from 'src/element-event'
import {MayRef} from 'src/types'
import {wrapRef} from 'src/wrap-ref'
import {ref} from 'vue-demi'
import {isClipboardAble} from './is-clipboard-able'

export * from './legacy'

export type ClipboardState = 'idle' | 'reading' | 'writing'

export const useClipboard = (
  initState?: MayRef<string | undefined>,
  updateOnEvent: boolean = false,
) => {
  const valueRef = wrapRef(initState)
  const isSupported = isClipboardAble()
  const stateRef = ref<ClipboardState>('idle')

  const read = async () => {
    if (!isSupported || stateRef.value !== 'idle') {
      return valueRef.value
    }

    stateRef.value = 'reading'
    const value = await navigator.clipboard.readText()
    valueRef.value = value
    stateRef.value = 'idle'
    return value
  }

  if (updateOnEvent && isSupported) {
    useElementEvent(window, 'copy' as any, read)
    useElementEvent(window, 'cut' as any, read)
  }

  const write = async (_value?: string) => {
    if (!isSupported || stateRef.value !== 'idle') {
      return valueRef.value
    }
    const {value} = valueRef
    if (value) {
      stateRef.value = 'writing'
      await navigator.clipboard.writeText(_value ?? value)

      stateRef.value = 'idle'
      read()
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
