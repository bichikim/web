import {BrowserStorageKind, CookieStorageOptions, createSoftBrowserStorage} from '@winter-love/utils'
import {ref, watch} from 'vue-demi'
import {useElementEvent} from '../element-event'
import {MayRef} from 'src/types'
import {wrapRef} from '../wrap-ref'

export interface StorageRefOptions<Data> {
  cookieOptions?: CookieStorageOptions
  /**
   * @deprecated please use the value
   */
  init?: Data
  type?: BrowserStorageKind
}

export const storageRef = <Data>(
  key: string,
  value?: MayRef<Data>,
  options: StorageRefOptions<Data> = {},
) => {
  const {type = 'local', cookieOptions} = options
  const valueRef = wrapRef<Data>(value)
  const freezeWatch = ref(false)
  const storage = createSoftBrowserStorage<Data | undefined>(type)
  if (!storage) {
    return valueRef
  }

  const updateStorage = (value: any) => {
    storage.setItem(key, value, cookieOptions)
    valueRef.value = value
  }

  const updateValue = (init?: any, freeze: boolean = false) => {
    if (freeze) {
      freezeWatch.value = true
    }

    const result = storage.getItem(key)

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
    storage.setItem(key, value, cookieOptions)
  })

  return valueRef
}

