import {defaultValue as _defaultValue} from '@winter-love/utils'
import {computed, Ref} from 'vue'

export function defaultRef<T>(
  value: Ref<T>,
  defaultValue?: () => T,
  defaultValueOnce?: boolean,
): Ref<T>
export function defaultRef<T>(value: Ref<T>, defaultValue?: T, defaultValueOnce?: boolean): Ref<T> {
  let first = true

  return computed({
    get: () => {
      const _value = value.value
      if (!first && defaultValueOnce) {
        return _value
      }
      if (typeof _value !== 'undefined') {
        first = false
      }
      return _defaultValue(_value, defaultValue)
    },
    set: (_value: T) => {
      value.value = _value
    },
  })
}
