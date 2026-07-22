import {
  CookieStorageOptions,
  getAnyStorageItem,
  setAnyStorageItem,
  StorageOptions,
} from '@winter-love/utils'
import {Accessor, createEffect, createSignal, onMount, Setter} from 'solid-js'
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

export const useStorage: UseStorage = (
  kind: any,
  key: any,
  options: Record<string, any> = {},
): StorageReturn<any> => {
  const {mounted, enforceValue, initValue = null, active = true} = options
  const keyAccessor = resolveAccessor(key)
  const beforeValue = mounted ? null : getAnyStorageItem(kind, keyAccessor(), initValue)
  const [value, _setValue] = createSignal(beforeValue)
  const activeAccessor = resolveAccessor(active)
  let isMounted = false
  let wasActive = false

  onMount(() => {
    if (enforceValue) {
      setValue(enforceValue)
    } else if (mounted && activeAccessor()) {
      // once
      setValue(() => getAnyStorageItem(kind, keyAccessor(), initValue))
    } else if (mounted) {
      setValue(initValue)
    }

    wasActive = activeAccessor()
    isMounted = true
  })

  // AI_NOTE - re-hydrate when active flips true after mount; mount skips read when inactive
  createEffect(() => {
    const isActive = activeAccessor()

    if (!isMounted || enforceValue) {
      return
    }

    if (isActive && !wasActive && mounted) {
      _setValue(() => getAnyStorageItem(kind, keyAccessor(), initValue))
    }

    wasActive = isActive
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
