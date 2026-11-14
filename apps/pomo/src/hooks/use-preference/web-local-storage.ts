import {subscribeWebStorageChange} from 'src/utils/subscribe-web-storage-change'
import {readWebStorageJson, writeWebStorageJson} from 'src/utils/runtime-storage'
import type {PreferenceStorage} from './types'

export const webLocalStorage: PreferenceStorage = {
  read: (key) => readWebStorageJson(key, (value) => value),
  subscribe: (onChange) => subscribeWebStorageChange({onChange}),
  write: writeWebStorageJson,
}
