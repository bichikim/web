import {defaultValue as _defaultValue, NotUndefined} from '@winter-love/utils'
import {computed, Ref} from 'vue'

export function defaultRef<T, R>(
  value: Ref<T>,
  defaultValue: (() => R) | R,
  defaultValueOnce?: boolean,
): Ref<NotUndefined<T> & R> {
  let first = true

  return computed({
    get: (): NotUndefined<T> & R => {
      const _value = value.value
      if (!first && defaultValueOnce) {
        // todo fix type
        return _value as any
      }
      if (_value !== undefined) {
        first = false
      }
      // todo fix type
      return _defaultValue(_value, defaultValue as any) as any
    },
    set: (_value: T) => {
      value.value = _value
    },
  })
}
