import {BrowserStorageKind, CookieStorageOptions} from '@winter-love/utils'
import {computed, getCurrentInstance, inject, InjectionKey, provide, reactive} from 'vue-demi'

export interface StorageRefOptions {
  readonly cookieOptions?: CookieStorageOptions
  /**
   * watch deeply to update storage
   */
  readonly deep?: boolean
  /**
   * remove saved data on init
   */
  readonly reset?: boolean
  readonly type?: BrowserStorageKind
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
  const instance = getCurrentInstance()
  const storage = instance ? inject(CONTEXT_STORAGE_KEY) ?? reactive({}) : reactive({})

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
