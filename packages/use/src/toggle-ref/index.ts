import {wrapRef} from '../wrap-ref'
import {MayRef} from '../types'
import {freeze} from '@winter-love/utils'

/**
 * @example
 * const valueRef = ref(false)
 * const {toggle, value} = toggleRef(valueRef)
 * @param value
 */
export const toggleRef = (value: MayRef<boolean> = false) => {
  const valueRef = wrapRef(value)

  const toggle = () => {
    valueRef.value = !valueRef.value
  }

  return freeze({
    toggle,
    value: valueRef,
  })
}
