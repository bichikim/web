import {Clipboard} from '@capacitor/clipboard'
import {ref} from 'vue'
import {MayRef, wrapRef} from '@winter-love/use'
import {Capacitor} from '@capacitor/core'

export type AppClipboardState = 'idle' | 'writing' | 'reading'
export type AppClipboardType = string

const checkPermission = async () => {
  const platform = Capacitor.getPlatform()
  if (platform === 'web') {
    // navigator.clipboard.readText()
    const result = await navigator.permissions.query({name: 'clipboard-read'})
    return result.state === 'granted' || result.state === 'prompt'
  }
  return true
}

export const useAppClipboard = (initState?: MayRef<string>) => {
  const valueRef = wrapRef(initState)
  const typeRef = ref<AppClipboardType | undefined>()
  const stateRef = ref<AppClipboardState>('idle')

  const read = async (): Promise<string | undefined> => {
    if (stateRef.value !== 'idle') {
      return Promise.resolve(valueRef.value)
    }

    stateRef.value = 'reading'
    return Clipboard.read().catch((error) => {
      if (process.env.NODE_ENV === 'development') {
        console.warn(error)
      }
      stateRef.value = 'idle'
    }).then((data) => {
      if (!data) {
        return
      }
      const {type, value} = data
      valueRef.value = value
      typeRef.value = type
      stateRef.value = 'idle'
      return value
    })
  }

  const write = async (value?: string) => {
    if (stateRef.value !== 'idle') {
      return valueRef.value
    }
    stateRef.value = 'writing'
    const _value = value ?? valueRef.value
    await Clipboard.write({
      string: _value,
    })
    stateRef.value = 'idle'
    valueRef.value = _value
  }

  return {
    checkPermission,
    read,
    state: stateRef,
    value: valueRef,
    write,
  }
}
