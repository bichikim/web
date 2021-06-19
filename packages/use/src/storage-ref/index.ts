import {getStorageAvailable, StorageType} from '@winter-love/utils'
import {ref, watch} from 'vue'
import stringify from 'fast-json-stable-stringify'
import {useElementEvent} from '../element-event'

export interface StorageRefOptions<Data> {
  init?: Data
  type?: StorageType
}

const getItem = (storage: Storage, key: string) => {
  let result
  try {
    const raw = storage.getItem(key)
    if (raw) {
      result = JSON.parse(raw)
    }
  } catch {
    return
  }
  return result
}

const setItem = (storage: Storage, key: string, value: any) => {
  storage.setItem(key, stringify(value))
}

export const storageRef = <Data>(key: string, options: StorageRefOptions<Data> = {}) => {
  const {type = 'local', init} = options
  const valueRef = ref<Data | undefined>()
  const freezeWatch = ref(false)
  const storage = getStorageAvailable(type)
  if (!storage) {
    return valueRef
  }

  const updateStorage = (value: any) => {
    setItem(storage, key, value)
    valueRef.value = value
  }

  const updateValue = (init?: any, freeze: boolean = false) => {
    if (freeze) {
      freezeWatch.value = true
    }

    const result = getItem(storage, key)

    if (typeof result !== 'undefined') {
      valueRef.value = getItem(storage, key)
      return
    }
    if (init) {
      updateStorage(init)
    }
  }

  updateValue(init)

  useElementEvent(window, 'storage', () => {
    updateValue(undefined, true)
  })

  watch(valueRef, (value) => {
    if (freezeWatch.value) {
      freezeWatch.value = false
      return
    }
    setItem(storage, key, value)
  })

  return valueRef
}
