import {
  CookieStorageOptions,
  getAnyStorageItem,
  setAnyStorageItem,
  StorageOptions,
} from '@winter-love/utils'
import {createEffect, createSignal, Signal, Accessor, Setter} from 'solid-js'
import {resolveAccessor} from 'src/resolve-accessor'
import {MayBeAccessor} from 'src/types'

interface UseStorage {
  <T>(
    kind: 'cookie',
    key: MayBeAccessor<string>,
    initValue?: T,
    options?: MayBeAccessor<CookieStorageOptions & StorageOptions>,
  ): StorageReturn<T>

  <T>(
    kind: 'local',
    key: MayBeAccessor<string>,
    initValue?: T,
    options?: MayBeAccessor<StorageOptions>,
  ): StorageReturn<T>

  <T>(
    kind: 'session',
    key: MayBeAccessor<string>,
    initValue?: T,
    options?: MayBeAccessor<StorageOptions>,
  ): StorageReturn<T>
}

type StorageReturn<T> = [Accessor<T>, Setter<T>, (value: boolean) => void]

export const useStorage: UseStorage = (
  kind: any,
  key: any,
  initValue = null,
  options: Record<string, any> = {},
): StorageReturn<any> => {
  const getKey = resolveAccessor(key)
  const beforeValue = getAnyStorageItem(kind, getKey(), initValue)
  const [value, setValue] = createSignal(beforeValue)
  let active = true

  createEffect(() => {
    if (active) {
      setAnyStorageItem(kind, getKey(), value(), options)
    }
  })

  const updateActive = (value: boolean) => {
    active = value
    if (!value) {
      setAnyStorageItem(kind, getKey(), null, options)
    }
  }

  return [value, setValue, updateActive]
}
