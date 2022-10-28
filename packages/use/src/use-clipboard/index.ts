import {freeze, getWindow} from '@winter-love/utils'
import {useEvent} from 'src/use-event'
import {MaybeRef} from 'src/types'
import {resolveRef} from 'src/resolve-ref'
import {bindRef} from 'src/bind-ref'
import {ref} from 'vue'

export * from './legacy'

export type ClipboardState = 'idle' | 'reading' | 'writing'

/**
 * @useful ⭐⭐⭐
 * @param initState
 * @param updateOnEvent
 */
export const useClipboard = (
  initState?: MaybeRef<string | undefined>,
  updateOnEvent: boolean = false,
) => {
  const valueRef = bindRef(resolveRef(initState))
  const window = getWindow()
  const navigator = window?.navigator
  const clipboard = navigator?.clipboard
  const stateRef = ref<ClipboardState>('idle')

  const read = async () => {
    if (!clipboard || stateRef.value !== 'idle') {
      return valueRef.value
    }

    stateRef.value = 'reading'
    const value = await clipboard.readText()
    valueRef.value = value
    stateRef.value = 'idle'
    return value
  }

  const write = async (_value?: string) => {
    if (!clipboard || stateRef.value !== 'idle') {
      return valueRef.value
    }

    const {value} = valueRef
    const newValue = _value ?? value
    if (newValue) {
      stateRef.value = 'writing'

      await clipboard.writeText(newValue)

      stateRef.value = 'idle'
      valueRef.value = newValue
    }
  }

  if (window && clipboard && updateOnEvent) {
    useEvent(window, 'copy' as any, read)
    useEvent(window, 'cut' as any, read)
  }

  return freeze({
    read,
    state: stateRef,
    value: valueRef,
    write,
  })
}
