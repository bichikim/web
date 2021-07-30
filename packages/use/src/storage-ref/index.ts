import {getStorageAvailable, StorageType} from '@winter-love/utils'
import {ref, watch} from 'vue-demi'
import stringify from 'fast-json-stable-stringify'
import {useElementEvent} from '../element-event'
import {MayRef} from 'src/types'
import {wrapRef} from '../wrap-ref'

export interface StorageRefOptions<Data> {
  /**
   * @deprecated please use the value
   */
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

export const storageRef = <Data>(
  key: string,
  value?: MayRef<Data | undefined>,
  options: StorageRefOptions<Data> = {},
) => {
  const {type = 'local'} = options
  const valueRef = wrapRef<Data | undefined>(value)
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
      valueRef.value = result
      return
    }
    if (init) {
      updateStorage(init)
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
    setItem(storage, key, value)
  })

  return valueRef
}

