import {mutRef} from 'src/refs/mut-ref'
import {resolveRef} from 'src/refs/resolve-ref'
import {MaybeRef} from 'src/types'
import {Ref} from 'vue'
import {defaultRef} from 'src/refs/default-ref'

/**
 * @example
 * const valueRef = ref(false)
 * const {toggle, value} = toggleRef(valueRef)
 * @param value
 */
export const toggleRef = (value?: MaybeRef<boolean>): [Ref<boolean>, () => void] => {
  const valueRef = mutRef(defaultRef(resolveRef(value), () => false))

  const toggle = () => {
    valueRef.value = !valueRef.value
  }

  return [valueRef, toggle]
}
