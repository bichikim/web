import {BrowserStorageKind, CookieStorageOptions} from '@winter-love/utils'
import {computed, inject, InjectionKey, provide, reactive} from 'vue-demi'

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

export const CONTEXT_STORAGE_KEY: InjectionKey<Record<string, any>> = Symbol('server-storage')

export const createContextStorage = () => {
  const storage = reactive<Record<string, any>>({})
  const provideStorage = () => {
    provide(CONTEXT_STORAGE_KEY, storage)
  }
  return {
    provideStorage,
    storage,
  }
}

export const useContextStorage = <T>(key: string, value?: T) => {
  const storage = inject(CONTEXT_STORAGE_KEY) ?? reactive({})

  if (value) {
    storage[key] = value
  }

  return computed<T>({
    get: () => {
      return storage[key]
    },
    set: (value) => {
      storage[key] = value
    },
  })
}
