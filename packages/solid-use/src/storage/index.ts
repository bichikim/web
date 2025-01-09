import {
  CookieStorageOptions,
  getAnyStorageItem,
  setAnyStorageItem,
  StorageOptions,
} from '@winter-love/utils'
import {Accessor, createSignal, onMount, Setter} from 'solid-js'
import {resolveAccessor} from 'src/resolve-accessor'
import {MayBeAccessor} from 'src/types'

export interface UseStorageOptions<T> extends StorageOptions {
  /**
   * override value
   */
  enforceValue?: T

  /**
   * read value after mounted
   */
  mounted?: boolean
}

interface UseStorage {
  <T>(
    kind: 'cookie',
    key: MayBeAccessor<string>,
    initValue?: T,
    options?: CookieStorageOptions & UseStorageOptions<T>,
  ): StorageReturn<T>

  <T>(
    kind: 'local',
    key: MayBeAccessor<string>,
    initValue?: T,
    options?: UseStorageOptions<T>,
  ): StorageReturn<T>

  <T>(
    kind: 'session',
    key: MayBeAccessor<string>,
    initValue?: T,
    options?: UseStorageOptions<T>,
  ): StorageReturn<T>
}

type StorageReturn<T> = [Accessor<T>, Setter<T>, (value: boolean) => void]

export const useStorage: UseStorage = (
  kind: any,
  key: any,
  initValue = null,
  options: Record<string, any> = {},
): StorageReturn<any> => {
  const {mounted, enforceValue} = options
  const keyAccessor = resolveAccessor(key)
  const beforeValue = mounted ? null : getAnyStorageItem(kind, keyAccessor(), initValue)
  const [value, _setValue] = createSignal(beforeValue)
  let active = true

  onMount(() => {
    if (enforceValue) {
      setValue(enforceValue)
    } else if (mounted) {
      // once
      setValue(() => getAnyStorageItem(kind, keyAccessor(), initValue))
    }
  })

  const setValue: any = (_value) => {
    const result = _setValue(_value)

    if (active) {
      setAnyStorageItem(kind, keyAccessor(), value(), options)
    }

    return result
  }

  const updateActive = (value: boolean) => {
    active = value

    // If active is false, delete the stored content
    if (!value) {
      setAnyStorageItem(kind, keyAccessor(), null, options)
    }
  }

  return [value, setValue, updateActive]
}
