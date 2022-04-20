import {freeze, getNavigator, getWindow} from '@winter-love/utils'
import {useElementEvent} from 'src/element-event'
import {MayRef} from 'src/types'
import {wrapRef} from 'src/wrap-ref'
import {ref} from 'vue-demi'

export * from './legacy'

export type ClipboardState = 'idle' | 'reading' | 'writing'

/**
 * @useful ⭐⭐⭐
 * @param initState
 * @param updateOnEvent
 */
export const useClipboard = (
  initState?: MayRef<string | undefined>,
  updateOnEvent: boolean = false,
) => {
  const valueRef = wrapRef(initState)
  const navigator = getNavigator()
  const clipboard = navigator?.clipboard
  const window = getWindow()
  const stateRef = ref<ClipboardState>('idle')

  const read = async () => {
    if (!clipboard || stateRef.value !== 'idle') {
      return valueRef.value
    }

    stateRef.value = 'reading'
    const value = await clipboard.readText()
    console.log(value)
    valueRef.value = value
    console.log(valueRef.value)
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
    useElementEvent(window, 'copy' as any, read)
    useElementEvent(window, 'cut' as any, read)
  }

  return freeze({
    read,
    state: stateRef,
    value: valueRef,
    write,
  })
}
