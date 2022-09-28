import {bindRef} from 'src/bind-ref'
import {resolveRef} from 'src/resolve-ref'
import {MaybeRef} from 'src/types'
import {Ref} from 'vue'
import {defaultRef} from 'src/default-ref'

/**
 * @example
 * const valueRef = ref(false)
 * const {toggle, value} = toggleRef(valueRef)
 * @param value
 * @param options
 */
export const toggleRef = (value?: MaybeRef<boolean>): [Ref<boolean>, () => void] => {
  const valueRef = bindRef(defaultRef(resolveRef(value), () => false))

  const toggle = () => {
    valueRef.value = !valueRef.value
  }

  return [valueRef, toggle]
}
