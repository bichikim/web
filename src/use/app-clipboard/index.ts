import {Clipboard} from '@capacitor/clipboard'
import {ref} from 'vue'
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

  const write = async (value: string) => {
    if (stateRef.value !== 'idle') {
      return valueRef.value
    }
    stateRef.value = 'writing'
    await Clipboard.write({
      string: value ?? valueRef.value,
    })
    stateRef.value = 'idle'
    return read()
  }

  return {
    read,
    state: stateRef,
    value: valueRef,
    write,
  }
}
