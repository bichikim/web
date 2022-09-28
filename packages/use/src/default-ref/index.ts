import {defaultValue as _defaultValue, MaybeFunction, NotFunction} from '@winter-love/utils'
import {computed, Ref} from 'vue'

export const defaultRef = <T extends NotFunction>(
  value: Ref<T>,
  defaultValue?: MaybeFunction<T>,
  defaultValueOnce?: boolean,
): Ref<T> => {
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
