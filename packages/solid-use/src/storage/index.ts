import {
  CookieStorageOptions,
  getAnyStorageItem,
  setAnyStorageItem,
  StorageOptions,
} from '@winter-love/utils'
import {createEffect, createSignal, Signal} from 'solid-js'
import {resolveAccessor} from 'src/resolve-accessor'
import {MayBeAccessor} from 'src/types'

interface UseStorage {
  <T>(
    kind: 'cookie',
    key: MayBeAccessor<string>,
    initValue?: T,
    options?: MayBeAccessor<CookieStorageOptions & StorageOptions>,
  ): Signal<T>

  <T>(
    kind: 'local',
    key: MayBeAccessor<string>,
    initValue?: T,
    options?: MayBeAccessor<StorageOptions>,
  ): Signal<T>

  <T>(
    kind: 'session',
    key: MayBeAccessor<string>,
    initValue?: T,
    options?: MayBeAccessor<StorageOptions>,
  ): Signal<T>
}

export const useStorage: UseStorage = (
  kind: any,
  key: any,
  initValue = null,
  options: Record<string, any> = {},
): Signal<any> => {
  const getKey = resolveAccessor(key)
  const beforeValue = getAnyStorageItem(kind, getKey(), initValue)
  const [value, setValue] = createSignal(beforeValue)

  createEffect(() => {
    setAnyStorageItem(kind, getKey(), value(), options)
  })

  return [value, setValue]
}
