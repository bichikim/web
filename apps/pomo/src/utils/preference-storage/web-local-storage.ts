import {readWebStorageJson, writeWebStorageJson} from 'src/utils/runtime-storage'
import type {PreferenceStorage} from './types'

export const webLocalStorage: PreferenceStorage = {
  read: (key) => readWebStorageJson(key, (value) => value),
  subscribe(onChange) {
    const handleStorage = (event: StorageEvent) => {
      if (event.storageArea === null || event.storageArea === globalThis.localStorage) {
        onChange(event.key)
      }
    }
    globalThis.addEventListener('storage', handleStorage)
    return () => globalThis.removeEventListener('storage', handleStorage)
  },
  write: writeWebStorageJson,
}
