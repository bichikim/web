import {wrapRef, WrapRefOptions} from 'src/wrap-ref'
import {MayRef} from 'src/types'
import {freeze} from '@winter-love/utils'

/**
 * @example
 * const valueRef = ref(false)
 * const {toggle, value} = toggleRef(valueRef)
 * @param value
 * @param options
 */
export const toggleRef = (
  value?: MayRef<boolean>,
  options?: Omit<WrapRefOptions<boolean>, 'defaultValue'>,
) => {
  const valueRef = wrapRef(value, {
    ...options,
    defaultValue: false,
  })

  const toggle = () => {
    console.log('toggle')
    valueRef.value = !valueRef.value
  }

  return freeze({
    toggle,
    value: valueRef,
  })
}
