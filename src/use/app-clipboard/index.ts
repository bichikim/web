import {Clipboard} from '@capacitor/clipboard'
import {nextTick, ref} from 'vue'
import {MayRef, wrapRef} from '@winter-love/use'

export type AppClipboardState = 'idle' | 'writing' | 'reading'
export type AppClipboardType = string

export const useAppClipboard = (initState?: MayRef<string>) => {
  const valueRef = wrapRef(initState)
  const typeRef = ref<AppClipboardType | undefined>()
  const stateRef = ref<AppClipboardState>('idle')

  const read = async () => {
    if (stateRef.value !== 'idle') {
      return valueRef.value
    }
    stateRef.value = 'reading'
    const {type, value} = await Clipboard.read()
    valueRef.value = value
    typeRef.value = type
    stateRef.value = 'idle'
    return value
  }

  const write = (value?: string) => {
    if (stateRef.value !== 'idle') {
      return valueRef.value
    }
    stateRef.value = 'writing'
    const _value = value ?? valueRef.value
    return nextTick(async () => {
      await Clipboard.write({
        string: _value,
      })
      stateRef.value = 'idle'
      valueRef.value = _value
    })

  }

  return {
    read,
    state: stateRef,
    value: valueRef,
    write,
  }
}
