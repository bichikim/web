import {BrowserStorageKind, createBrowserStorage, isSSR} from '@winter-love/utils'
import {MayRef} from 'src/types'
import {ref, watch} from 'vue-demi'
import {StorageRefOptions, useContextStorage} from '../context-storage'
import {useElementEvent} from '../element-event'
import {wrapRef} from '../wrap-ref'

export const storageRef = <Data>(
  key: string,
  value?: MayRef<Data>,
  options: StorageRefOptions = {},
) => {
  const {
    type = 'local' as BrowserStorageKind,
    cookieOptions,
    deep,
    reset,
  } = options
  const valueRef = wrapRef<Data>(value)
  const freezeWatch = ref(false)
  const storage = createBrowserStorage<Data | undefined>(type)
  const contextStorage = useContextStorage(key)

  // update server serverStorage
  if (isSSR()) {
    contextStorage.value = valueRef.value
    return valueRef
  }

  const initValue = storage().getItem(key)

  if (!initValue || reset) {
    storage(cookieOptions).setItem(key, valueRef.value)
  } else {
    valueRef.value = initValue
  }

  const updateValue = (init?: any, freeze: boolean = false) => {
    if (freeze) {
      freezeWatch.value = true
    }

    const result = storage().getItem(key)

    if (typeof result !== 'undefined') {
      valueRef.value = result
    }
  }

  updateValue(valueRef.value)

  useElementEvent(window, 'storage', () => {
    updateValue(undefined, true)
  })

  watch(valueRef, (value) => {
    if (freezeWatch.value) {
      freezeWatch.value = false
      return
    }
    storage(cookieOptions).setItem(key, value)
  }, {deep})

  return valueRef
}

