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
   * Accepts an accessor for values that resolve after mount (e.g. async resources).
   */
  enforceValue?: MaybeAccessor<T | undefined>
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
  const {mounted, initValue = null, active = true} = options
  const hasEnforceValueOption = 'enforceValue' in options
  const enforceValueAccessor = hasEnforceValueOption
    ? resolveAccessor(options.enforceValue as MaybeAccessor<T | undefined>)
    : null
  const keyAccessor = resolveAccessor(key)
  const beforeValue = mounted ? null : getAnyStorageItem(kind, keyAccessor(), initValue)
  const [value, _setValue] = createSignal(beforeValue)
  const activeAccessor = resolveAccessor(active)
  let isMounted = false

  if (enforceValueAccessor) {
    createEffect(() => {
      const enforced = enforceValueAccessor()

      if (enforced !== undefined) {
        setValue(enforced)
      }
    })
  }

  onMount(() => {
    if (enforceValueAccessor) {
      const enforced = enforceValueAccessor()

      if (enforced !== undefined) {
        setValue(enforced)
      }
      // AI_NOTE - Skip storage read while enforceValue is configured but still unresolved (async).
    } else if (mounted) {
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
