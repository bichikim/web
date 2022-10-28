import {CookieStorageOptions, createStorage} from '@winter-love/utils'
import {MaybeRef} from 'src/types'
import {computed, ref, watch} from 'vue'
import {resolveRef} from '../resolve-ref'
import {bindRef} from '../bind-ref'
import {useEvent} from '../use-event'

export type BrowserStorageKind = 'local' | 'session' | 'cookie'

export interface StorageRefOptions {
  reset?: boolean
}

export interface CookieStorageRefOptions extends StorageRefOptions, CookieStorageOptions {
  //
}

export function storageRef<Data>(
  type: 'local',
  key: string,
  value?: MaybeRef<Data>,
  options?: MaybeRef<StorageRefOptions>,
)
export function storageRef<Data>(
  type: 'session',
  key: string,
  value?: MaybeRef<Data>,
  options?: MaybeRef<StorageRefOptions>,
)
export function storageRef<Data>(
  type: 'cookie',
  key: string,
  value?: MaybeRef<Data>,
  options?: MaybeRef<CookieStorageRefOptions>,
)
export function storageRef<Data>(
  type: any,
  key: string,
  value?: MaybeRef<Data>,
  options?: MaybeRef<Record<string, any>>,
) {
  const valueRef = bindRef(resolveRef<Data>(value))
  const optionsRef = resolveRef(options)
  const freezeWatch = ref(false)
  const storageRef = computed(() => createStorage(type, optionsRef.value))
  const reset = computed(() => optionsRef.value?.rest ?? false)

  const initValue = storageRef.value.get(key)

  if (reset.value || valueRef.value) {
    storageRef.value.set(key, valueRef.value)
  } else {
    valueRef.value = initValue
  }

  const updateValue = (init?: any, freeze: boolean = false) => {
    if (freeze) {
      freezeWatch.value = true
    }

    const result = storageRef.value.get(key)

    if (typeof result !== 'undefined') {
      valueRef.value = result
    }
  }

  updateValue(valueRef.value)

  useEvent(window, 'storage', () => {
    updateValue(undefined, true)
  })

  watch(valueRef, (value) => {
    if (freezeWatch.value) {
      freezeWatch.value = false
      return
    }
    storageRef.value.set(key, value)
  })

  return valueRef
}
