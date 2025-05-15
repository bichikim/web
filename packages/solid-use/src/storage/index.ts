import {CookieStorageOptions, getAnyStorageItem, setAnyStorageItem, StorageOptions} from '@winter-love/utils'
import {Accessor, createSignal, onMount, Setter} from 'solid-js'
import {resolveAccessor} from 'src/resolve-accessor'
import {MaybeAccessor} from 'src/types'

export interface UseStorageOptions<T> extends StorageOptions {
  /**
   * active state
   */
  active?: MaybeAccessor<boolean>
  /**
   * Value that will be enforced regardless of stored value. When set, this value will override any existing value in storage.
   */
  enforceValue?: T
  /**
   * initial value to use when no stored value exists
   */
  initValue?: T

  /**
   * read value after mounted
   */
  mounted?: boolean
}

/**
 * Storage hook function type
 * @template T Type of value to store
 * @param kind Storage type ('cookie' | 'local' | 'session')
 * @param key Storage key
 * @param options Storage options
 * @returns [value accessor, value setter, active state setter]
 */
interface UseStorage {
  <T>(
    kind: 'cookie',
    key: MaybeAccessor<string>,
    options?: CookieStorageOptions & UseStorageOptions<T>,
  ): StorageReturn<T>

  <T>(kind: 'local', key: MaybeAccessor<string>, options?: UseStorageOptions<T>): StorageReturn<T>

  <T>(kind: 'session', key: MaybeAccessor<string>, options?: UseStorageOptions<T>): StorageReturn<T>
}

type StorageReturn<T> = [Accessor<T>, Setter<T>]

export const useStorage: UseStorage = (kind: any, key: any, options: Record<string, any> = {}): StorageReturn<any> => {
  const {mounted, enforceValue, initValue = null, active = true} = options
  const keyAccessor = resolveAccessor(key)
  const beforeValue = mounted ? null : getAnyStorageItem(kind, keyAccessor(), initValue)
  const [value, _setValue] = createSignal(beforeValue)
  const activeAccessor = resolveAccessor(active)
  let isMounted = false

  onMount(() => {
    if (enforceValue) {
      setValue(enforceValue)
    } else if (mounted) {
      // once
      setValue(() => getAnyStorageItem(kind, keyAccessor(), initValue))
    }

    isMounted = true
  })

  const setValue: any = (_value) => {
    const result = _setValue(_value)

    if (isMounted && activeAccessor()) {
      setAnyStorageItem(kind, keyAccessor(), value(), options)
    }

    return result
  }

  return [value, setValue]
}
