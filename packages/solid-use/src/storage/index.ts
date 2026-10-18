import {
  CookieStorageOptions,
  getAnyStorageItem,
  setAnyStorageItem,
  StorageOptions,
} from '@winter-love/utils'
import {Accessor, batch, createEffect, createSignal, onMount, Setter, untrack} from 'solid-js'
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
 * todo solidstart 에서 쿠키가 지금 구현 방법으로는 동작하지 않음 수정 해야된다
 * 가능 하다면 apps/coong 에서 직접 구현하거나 cookie 가져오는 방법이 있는 함수를 전달하는 방법으로 해결해야함
 * Storage hook function type
 * @template T Type of value to store
 * @param kind Storage type ('cookie' | 'local' | 'session')
 * @param key Storage key
 * @param options Storage options
 * @returns [value accessor, value setter]
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

export const useStorage: UseStorage = (
  kind: any,
  key: any,
  options: Record<string, any> = {},
): StorageReturn<any> => {
  const {mounted, enforceValue, initValue = null, active = true} = options
  const keyAccessor = resolveAccessor(key)
  const initialKey = keyAccessor()
  const initialValue = mounted ? null : getAnyStorageItem(kind, initialKey, initValue)
  const [value, setMemoryValue] = createSignal(initialValue)
  const activeAccessor = resolveAccessor(active)

  const hasEnforcedValue = Object.hasOwn(options, 'enforceValue')
  let isMounted = false
  let previousActive = false
  let dirtyWhileInactive = false
  let currentKey = initialKey

  const restoreValue = (isActive: boolean) => {
    const nextValue = hasEnforcedValue
      ? enforceValue
      : isActive
        ? getAnyStorageItem(kind, currentKey, initValue)
        : initValue

    setMemoryValue(() => nextValue)

    if (hasEnforcedValue && isActive) {
      setAnyStorageItem(kind, currentKey, nextValue, options)
    }
  }

  onMount(() => {
    const isActive = activeAccessor()
    const nextKey = keyAccessor()
    const keyChanged = nextKey !== currentKey
    currentKey = nextKey

    if (hasEnforcedValue || mounted || keyChanged) {
      restoreValue(isActive)
    }

    previousActive = isActive
    isMounted = true
  })

  const synchronizeStorage = () => {
    const isActive = activeAccessor()
    const nextKey = keyAccessor()

    if (!isMounted) {
      return
    }

    if (nextKey !== currentKey) {
      currentKey = nextKey
      dirtyWhileInactive = false
      restoreValue(isActive)
    } else if (isActive && !previousActive && (dirtyWhileInactive || hasEnforcedValue || mounted)) {
      if (dirtyWhileInactive && !hasEnforcedValue) {
        setAnyStorageItem(kind, currentKey, untrack(value), options)
        dirtyWhileInactive = false
      } else {
        restoreValue(isActive)
      }
    }

    previousActive = isActive
  }

  createEffect(synchronizeStorage)

  const setValue: typeof setMemoryValue = (nextValue?) =>
    batch(() => {
      // Reflect batched key and activation changes before applying an explicit edit.
      untrack(synchronizeStorage)
      const result = setMemoryValue(nextValue)

      if (isMounted && activeAccessor()) {
        setAnyStorageItem(kind, currentKey, value(), options)
      } else if (isMounted) {
        dirtyWhileInactive = true
      }

      return result
    })

  return [value, setValue]
}
