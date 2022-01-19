import {BrowserStorageKind, CookieStorageOptions, createSoftBrowserStorage} from '@winter-love/utils'
import {ref, watch} from 'vue-demi'
import {useElementEvent} from '../element-event'
import {MayRef} from 'src/types'
import {wrapRef} from '../wrap-ref'

export interface StorageRefOptions {
  cookieOptions?: CookieStorageOptions
  /**
   * watch deeply to update storage
   */
  deep?: boolean
  /**
   * remove saved data on init
   */
  reset?: boolean
  type?: BrowserStorageKind
}

export const storageRef = <Data>(
  key: string,
  value?: MayRef<Data>,
  options: StorageRefOptions = {},
) => {
  const {type = 'local', cookieOptions, deep, reset} = options
  const valueRef = wrapRef<Data>(value)
  const freezeWatch = ref(false)
  const storage = createSoftBrowserStorage<Data | undefined>(type)
  if (!storage) {
    return valueRef
  }

  const initValue = storage.getItem(key)

  if (!initValue || reset) {
    storage.setItem(key, valueRef.value, cookieOptions)
  } else {
    valueRef.value = initValue
  }

  const updateValue = (init?: any, freeze: boolean = false) => {
    if (freeze) {
      freezeWatch.value = true
    }

    const result = storage.getItem(key)

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
    storage.setItem(key, value, cookieOptions)
  }, {deep})

  return valueRef
}

